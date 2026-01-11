import React, { useState } from 'react';
import { AppState, Role, Staff } from '../types';
import { Trash2, Plus, Edit } from 'lucide-react';

interface StaffPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const StaffPage: React.FC<StaffPageProps> = ({ state, setState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({});

  const startEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setFormData({ ...staff });
  };

  const startAdd = () => {
    setEditingId('NEW');
    setFormData({
      name: '',
      role: Role.DAY_STAFF,
      maxLeaves: 8,
      designatedDaysOff: [],
      canNight: false
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('確定刪除此人員？將移除其所有排班資料。')) {
      setState(prev => {
         const newAssignments = { ...prev.schedule.assignments };
         // Cleanup assignments
         Object.keys(newAssignments).forEach(date => {
           if (newAssignments[date][id]) {
             delete newAssignments[date][id];
           }
         });
         return {
           ...prev,
           staffList: prev.staffList.filter(s => s.id !== id),
           schedule: { ...prev.schedule, assignments: newAssignments }
         };
      });
    }
  };

  const handleSave = () => {
    if (!formData.name) return alert('請輸入姓名');
    
    setState(prev => {
      let newList = [...prev.staffList];
      if (editingId === 'NEW') {
        const newStaff: Staff = {
          id: Date.now().toString(),
          name: formData.name!,
          role: formData.role || Role.DAY_STAFF,
          maxLeaves: formData.maxLeaves || 8,
          designatedDaysOff: formData.designatedDaysOff || [],
          canNight: formData.canNight || false
        };
        newList.push(newStaff);
      } else {
        newList = newList.map(s => s.id === editingId ? { ...s, ...formData } as Staff : s);
      }
      return { ...prev, staffList: newList };
    });
    setEditingId(null);
  };

  const toggleDayOff = (day: number) => {
    const current = formData.designatedDaysOff || [];
    if (current.includes(day)) {
      setFormData({ ...formData, designatedDaysOff: current.filter(d => d !== day) });
    } else {
      if (current.length >= 3) return alert('每月最多 3 天指定休假');
      setFormData({ ...formData, designatedDaysOff: [...current, day].sort((a,b) => a-b) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">人員名單 ({state.staffList.length})</h2>
        <button onClick={startAdd} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-brand-700 transition">
          <Plus className="w-4 h-4" /> 新增人員
        </button>
      </div>

      {editingId && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-brand-200 mb-6 animate-fade-in">
          <h3 className="font-bold text-lg mb-4">{editingId === 'NEW' ? '新增人員' : '編輯人員'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <label className="block">
                <span className="text-sm font-medium text-slate-700">姓名</span>
                <input 
                  value={formData.name || ''} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2"
                />
             </label>
             <label className="block">
                <span className="text-sm font-medium text-slate-700">角色</span>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2"
                >
                  <option value={Role.DAY_STAFF}>日班人員</option>
                  <option value={Role.NIGHT_FIX}>夜櫃固定</option>
                  <option value={Role.SUBSTITUTE}>替補人員</option>
                </select>
             </label>
             <label className="block">
                <span className="text-sm font-medium text-slate-700">本月休假額度</span>
                <input 
                  type="number"
                  value={formData.maxLeaves} 
                  onChange={e => setFormData({ ...formData, maxLeaves: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-slate-300 border p-2"
                />
             </label>
             <div className="flex items-center mt-6">
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.canNight}
                    onChange={e => setFormData({ ...formData, canNight: e.target.checked })}
                    className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">可支援夜櫃?</span>
               </label>
             </div>
          </div>
          
          <div className="mt-4">
            <span className="text-sm font-medium text-slate-700 mb-2 block">指定休假日 (最多3天, 點擊選擇)</span>
            <div className="flex flex-wrap gap-1">
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  onClick={() => toggleDayOff(d)}
                  className={`w-8 h-8 rounded text-xs font-medium transition
                    ${(formData.designatedDaysOff || []).includes(d) 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                  `}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
             <button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
             <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700">儲存</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="p-4">姓名</th>
              <th className="p-4">角色</th>
              <th className="p-4">休假額度</th>
              <th className="p-4">指定休假</th>
              <th className="p-4">支援夜櫃</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.staffList.map(staff => (
              <tr key={staff.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{staff.name}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium 
                    ${staff.role === Role.NIGHT_FIX ? 'bg-purple-100 text-purple-700' : 
                      staff.role === Role.SUBSTITUTE ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {staff.role}
                  </span>
                </td>
                <td className="p-4">{staff.maxLeaves}</td>
                <td className="p-4 text-slate-500">{staff.designatedDaysOff.length > 0 ? staff.designatedDaysOff.join(', ') + ' 號' : '-'}</td>
                <td className="p-4">{staff.canNight ? '✅' : '-'}</td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => startEdit(staff)} className="p-1 text-slate-400 hover:text-brand-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(staff.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffPage;
