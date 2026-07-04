import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Trash2, Calendar, Search, Mail } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { api, user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registered users list');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    setError(null);
    setSuccess(null);

    try {
      const res = await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.data.user.role } : u))
      );
      setSuccess(`Role updated successfully for user.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setError(null);
    setSuccess(null);

    if (userId === currentUser?.id) {
      setError('You cannot delete your own admin account');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSuccess(`User "${userName}" was successfully removed from the system.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Users className="w-8 h-8 text-brand-400" /> Admin Command Hub
        </h1>
        <p className="text-sm text-slate-400 mt-1">Manage global system access, modify roles, and purge user data.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-850 p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="block w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-medium">Role Filter:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-full sm:w-44"
          >
            <option value="ALL">All System Roles</option>
            <option value="STUDENT">STUDENT</option>
            <option value="TEACHER">TEACHER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">User Details</th>
                <th className="py-4 px-6">Account Created</th>
                <th className="py-4 px-6">System Role</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No registered users match your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u._id === currentUser?.id;

                  return (
                    <tr key={u._id} className="hover:bg-slate-900/30 transition-colors">
                      {/* Name / Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-white text-sm">{u.name}</div>
                          {isSelf && (
                            <span className="bg-brand-500/10 border border-brand-500/25 text-brand-400 text-[8px] font-bold px-1.5 py-0.2 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-600" />
                          {u.email}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-6 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-600" />
                          {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Role selection dropdown */}
                      <td className="py-4 px-6">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u._id, e.target.value as any)}
                          className="px-2.5 py-1.5 border border-slate-850 rounded-lg bg-slate-900 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      {/* Purge user action */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={isSelf}
                          className="p-2 rounded-lg bg-red-500/10 border border-transparent hover:border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSelf ? 'Cannot delete self' : 'Purge user data'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
