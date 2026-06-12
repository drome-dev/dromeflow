import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, updateUser } from '../../services/auth/users.service';

const { mockRpc, mockFrom } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
  return { mockRpc, mockFrom };
});

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

describe('users.service', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockClear();
  });

  it('createUser: chama create_user_v2 com dados corretos', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, user_id: 'u-1', auth_user_id: 'a-1' }, error: null });

    await createUser({
      email: 'new@test.com',
      password: 'SenhaForte1!',
      full_name: 'Novo',
      role: 'user',
      unit_ids: [],
      module_ids: [],
      display_name: 'Novo Display',
      phone: '11999999999',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_user_v2', expect.objectContaining({
      p_email: 'new@test.com',
      p_full_name: 'Novo',
      p_display_name: 'Novo Display',
      p_phone: '11999999999',
    }));
  });

  it('createUser: falha sem email ou senha', async () => {
    await expect(createUser({ email: '', password: '', full_name: '', role: 'user' })).rejects.toThrow(
      'Email e senha são obrigatórios.'
    );
  });

  it('updateUser: chama update_user_v2 com dados corretos', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, user_id: 'u-1' }, error: null });

    await updateUser('u-1', { full_name: 'Atualizado', email: 'a@test.com', role: 'admin' });

    expect(mockRpc).toHaveBeenCalledWith('update_user_v2', expect.objectContaining({
      p_user_id: 'u-1',
      p_full_name: 'Atualizado',
      p_email: 'a@test.com',
      p_role: 'admin',
    }));
  });

  it('updateUser: falha quando RPC retorna erro', async () => {
    mockRpc.mockResolvedValue({ data: { success: false, error: 'Usuário não encontrado.' }, error: null });

    await expect(updateUser('u-inexistente', { full_name: 'X' })).rejects.toThrow('Usuário não encontrado.');
  });
});
