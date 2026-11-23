import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Btn, ctl, ErrorBox, Loading, Modal, PageHeader, Pagination, Row, tableBase, tableWrap, td, th, thead, trow, useAction } from '../../components/admin/ui';
import Icon from '../../components/ui/Icon';
import { adminApi } from '../../services/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import type { Role } from '../../types';

function NewUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { run, busy, error } = useAction();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { full_name: '', email: '', password: '', role: 'staff' as Role } });
  const submit = handleSubmit(async (v) => { if (await run(() => adminApi.createUser(v))) { onCreated(); onClose(); } });
  return (
    <Modal title="New staff or admin account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-space-sm" aria-label="New user form" noValidate>
        <Row label="Full name *"><input className={ctl} {...register('full_name', { required: 'Required', minLength: { value: 2, message: 'Too short' } })} />{errors.full_name && <span role="alert" className="text-error normal-case">{errors.full_name.message}</span>}</Row>
        <Row label="Email *"><input type="email" className={ctl} {...register('email', { required: 'Required' })} />{errors.email && <span role="alert" className="text-error normal-case">{errors.email.message}</span>}</Row>
        <Row label="Temporary password *" hint="At least 8 characters. Ask the person to keep it private."><input type="password" autoComplete="new-password" className={ctl} {...register('password', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })} />{errors.password && <span role="alert" className="text-error normal-case">{errors.password.message}</span>}</Row>
        <Row label="Role"><select className={ctl} {...register('role')}><option value="staff">Staff</option><option value="admin">Admin</option><option value="customer">Customer</option></select></Row>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2"><Btn type="submit" disabled={busy} data-testid="save-user">Create account</Btn><Btn variant="secondary" onClick={onClose}>Cancel</Btn></div>
      </form>
    </Modal>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useAsync(() => adminApi.users({ role, page }), [role, page]);
  const { run, busy, error: actionError } = useAction();
  const patch = async (id: string, d: { role?: Role; is_active?: boolean }) => { if (await run(() => adminApi.updateUser(id, d))) reload(); };
  return (
    <>
      <PageHeader divider eyebrow={['Islamabad atelier archive', 'Staff management']} title="Users" subtitle="Admin only. You cannot change your own role or deactivate yourself." actions={<Btn onClick={() => setCreating(true)} data-testid="new-user"><Icon name="person_add" className="text-[16px]" />New account</Btn>} />
      <div className="mb-6"><select className={`${ctl} sm:w-56 !bg-white`} aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }}><option value="">All roles</option><option value="admin">Admin</option><option value="staff">Staff</option><option value="customer">Customer</option></select></div>
      {actionError && <div className="mb-4"><ErrorBox message={actionError} /></div>}
      {loading && !data && <Loading />}{error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className={tableWrap}><table className={tableBase} data-testid="users-table">
          <thead className={thead}><tr>{['Name', 'Email', 'Role', 'Active', 'Created'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{data.items.map((u) => { const self = u.id === me?.id; return (
            <tr key={u.id} className={trow}>
              <td className={`${td} font-medium text-primary`}><span className="inline-flex flex-wrap items-center gap-2">{u.full_name}{self && <Badge tone="info">you</Badge>}</span></td><td className={`${td} text-slate-text break-all`}>{u.email}</td>
              <td className={td}><select aria-label={`Role for ${u.email}`} className={`${ctl} !w-auto min-w-[9rem] !bg-white`} value={u.role} disabled={self || busy} onChange={(e) => patch(u.id, { role: e.target.value as Role })}><option value="admin">Admin</option><option value="staff">Staff</option><option value="customer">Customer</option></select></td>
              <td className={td}><div className="flex flex-wrap items-center gap-2"><Btn variant={u.is_active ? 'secondary' : 'primary'} disabled={self || busy} onClick={() => patch(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Deactivate' : 'Activate'}</Btn>{!u.is_active && <Badge tone="bad">inactive</Badge>}</div></td>
              <td className={`${td} whitespace-nowrap`}>{formatDate(u.created_at)}</td></tr>); })}</tbody></table></div>
      )}
      {data && <Pagination page={page} total={data.total} pageSize={20} onPage={setPage} />}
      {creating && <NewUser onClose={() => setCreating(false)} onCreated={reload} />}
    </>
  );
}
