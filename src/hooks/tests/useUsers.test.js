import { renderHook, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useUsers } from '../useUsers';
import { findAll, remove, save, update } from '../../services/userService';
import { AuthContext } from '../../auth/context/AuthContext';

// Mocks
jest.mock('../../services/userService');
jest.mock('sweetalert2');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

describe('useUsers Hook', () => {
    const mockHandlerLogout = jest.fn();
    const mockLogin = { isAdmin: true };

    const wrapper = ({ children }) => (
        <AuthContext.Provider value={{ login: mockLogin, handlerLogout: mockHandlerLogout }}>
            <BrowserRouter>{children}</BrowserRouter>
        </AuthContext.Provider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
        Swal.fire.mockResolvedValue({ isConfirmed: true });
    });

    describe('getUsers', () => {
        it('debe cargar usuarios exitosamente', async () => {
            const mockUsers = [
                { id: 1, username: 'user1', email: 'user1@test.com', admin: false },
                { id: 2, username: 'user2', email: 'user2@test.com', admin: true },
            ];
            findAll.mockResolvedValue({ data: mockUsers });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.getUsers();
            });

            expect(findAll).toHaveBeenCalledTimes(1);
            expect(result.current.users).toEqual(mockUsers);
        });

        it('debe manejar error 401 y llamar handlerLogout', async () => {
            findAll.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.getUsers();
            });

            expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
        });
    });

    describe('handlerAddUser', () => {
        it('debe crear un nuevo usuario exitosamente', async () => {
            const newUser = {
                id: 0,
                username: 'newuser',
                password: 'password123',
                email: 'new@test.com',
                admin: false,
            };
            const savedUser = { ...newUser, id: 3 };
            save.mockResolvedValue({ data: savedUser });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser(newUser);
            });

            expect(save).toHaveBeenCalledWith(newUser);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Usuario Creado',
                'El usuario ha sido creado con exito!',
                'success'
            );
            expect(result.current.visibleForm).toBe(false);
        });

        it('debe actualizar un usuario existente exitosamente', async () => {
            const existingUser = {
                id: 1,
                username: 'updateduser',
                password: 'password123',
                email: 'updated@test.com',
                admin: false,
            };
            update.mockResolvedValue({ data: existingUser });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser(existingUser);
            });

            expect(update).toHaveBeenCalledWith(existingUser);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Usuario Actualizado',
                'El usuario ha sido actualizado con exito!',
                'success'
            );
        });

        it('no debe permitir agregar usuario si no es admin', async () => {
            const nonAdminWrapper = ({ children }) => (
                <AuthContext.Provider value={{ login: { isAdmin: false }, handlerLogout: mockHandlerLogout }}>
                    <BrowserRouter>{children}</BrowserRouter>
                </AuthContext.Provider>
            );

            const { result } = renderHook(() => useUsers(), { wrapper: nonAdminWrapper });

            await act(async () => {
                await result.current.handlerAddUser({ id: 0, username: 'test' });
            });

            expect(save).not.toHaveBeenCalled();
        });

        it('debe manejar errores de validación 400', async () => {
            const validationErrors = {
                username: 'El username es requerido',
                email: 'Email inválido',
            };
            save.mockRejectedValue({
                response: { status: 400, data: validationErrors },
            });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser({ id: 0, username: '' });
            });

            expect(result.current.errors).toEqual(validationErrors);
        });

        it('debe manejar error de username duplicado (500)', async () => {
            save.mockRejectedValue({
                response: {
                    status: 500,
                    data: { message: 'constraint [UK_username]' },
                },
            });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser({ id: 0, username: 'duplicate' });
            });

            expect(result.current.errors.username).toBe('El username ya existe!');
        });

        it('debe manejar error de email duplicado (500)', async () => {
            save.mockRejectedValue({
                response: {
                    status: 500,
                    data: { message: 'constraint [UK_email]' },
                },
            });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser({ id: 0, email: 'duplicate@test.com' });
            });

            expect(result.current.errors.email).toBe('El email ya existe!');
        });

        it('debe llamar handlerLogout en error 401', async () => {
            save.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerAddUser({ id: 0, username: 'test' });
            });

            expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
        });
    });

    describe('handlerRemoveUser', () => {
        it('debe eliminar usuario exitosamente cuando se confirma', async () => {
            remove.mockResolvedValue({});
            Swal.fire.mockResolvedValue({ isConfirmed: true });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveUser(1);
            });

            await waitFor(() => {
                expect(remove).toHaveBeenCalledWith(1);
                expect(Swal.fire).toHaveBeenCalledWith(
                    'Usuario Eliminado!',
                    'El usuario ha sido eliminado con exito!',
                    'success'
                );
            });
        });

        it('no debe eliminar usuario si se cancela', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: false });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveUser(1);
            });

            expect(remove).not.toHaveBeenCalled();
        });

        it('no debe permitir eliminar si no es admin', async () => {
            const nonAdminWrapper = ({ children }) => (
                <AuthContext.Provider value={{ login: { isAdmin: false }, handlerLogout: mockHandlerLogout }}>
                    <BrowserRouter>{children}</BrowserRouter>
                </AuthContext.Provider>
            );

            const { result } = renderHook(() => useUsers(), { wrapper: nonAdminWrapper });

            await act(async () => {
                await result.current.handlerRemoveUser(1);
            });

            expect(Swal.fire).not.toHaveBeenCalled();
            expect(remove).not.toHaveBeenCalled();
        });

        it('debe manejar error 401 al eliminar', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: true });
            remove.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useUsers(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveUser(1);
            });

            await waitFor(() => {
                expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Form Handlers', () => {
        it('debe abrir el formulario', () => {
            const { result } = renderHook(() => useUsers(), { wrapper });

            act(() => {
                result.current.handlerOpenForm();
            });

            expect(result.current.visibleForm).toBe(true);
        });

        it('debe cerrar el formulario y resetear estado', () => {
            const { result } = renderHook(() => useUsers(), { wrapper });

            act(() => {
                result.current.handlerOpenForm();
                result.current.handlerCloseForm();
            });

            expect(result.current.visibleForm).toBe(false);
            expect(result.current.userSelected).toEqual({
                id: 0,
                username: '',
                password: '',
                email: '',
                admin: false,
            });
            expect(result.current.errors).toEqual({});
        });

        it('debe seleccionar usuario para editar', () => {
            const user = {
                id: 1,
                username: 'testuser',
                email: 'test@test.com',
                admin: true,
            };

            const { result } = renderHook(() => useUsers(), { wrapper });

            act(() => {
                result.current.handlerUserSelectedForm(user);
            });

            expect(result.current.visibleForm).toBe(true);
            expect(result.current.userSelected).toEqual(user);
        });
    });

    describe('Estado inicial', () => {
        it('debe tener el estado inicial correcto', () => {
            const { result } = renderHook(() => useUsers(), { wrapper });

            expect(result.current.users).toEqual([]);
            expect(result.current.userSelected).toEqual({
                id: 0,
                username: '',
                password: '',
                email: '',
                admin: false,
            });
            expect(result.current.visibleForm).toBe(false);
            expect(result.current.errors).toEqual({
                username: '',
                password: '',
                email: '',
            });
        });
    });
});