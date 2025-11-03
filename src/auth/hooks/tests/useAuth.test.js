import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../useAuth';
import { loginUser } from '../../services/authService';

// Mocks
jest.mock('../../services/authService');
jest.mock('sweetalert2');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

describe('useAuth Hook', () => {
    const mockNavigate = jest.fn();

    // Mock de sessionStorage
    const sessionStorageMock = (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => {
                store[key] = value.toString();
            },
            removeItem: (key) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            }
        };
    })();

    beforeAll(() => {
        Object.defineProperty(window, 'sessionStorage', {
            value: sessionStorageMock,
            writable: true
        });

        // eslint-disable-next-line no-undef
        jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    });

    const wrapper = ({ children }) => (
        <BrowserRouter>{children}</BrowserRouter>
    );

    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorageMock.clear();
        console.log = jest.fn();
        Swal.fire.mockResolvedValue({});
    });

    describe('Estado inicial', () => {
        it('debe tener el estado inicial correcto cuando no hay sesión', () => {
            sessionStorageMock.clear(); // Asegurar que está limpio
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current.login).toEqual({
                isAuth: false,
                isAdmin: false,
                user: undefined,
            });
        });

        it('debe persistir el estado en sessionStorage después del login', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            // Hacer login para probar la persistencia
            const mockToken = createMockToken('admin', true);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'admin',
                    password: 'admin123',
                });
            });

            // Verificar que se guardó en sessionStorage
            const savedLogin = JSON.parse(sessionStorage.getItem('login'));
            expect(savedLogin).toEqual({
                isAuth: true,
                isAdmin: true,
                user: { username: 'admin' },
            });
        });
    });

    describe('handlerLogin', () => {
        it('debe hacer login exitosamente como usuario normal', async () => {
            const mockToken = createMockToken('testuser', false);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            expect(loginUser).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123',
            });

            expect(result.current.login).toEqual({
                isAuth: true,
                isAdmin: false,
                user: { username: 'testuser' },
            });

            expect(sessionStorage.getItem('token')).toBe(`Bearer ${mockToken}`);
            expect(mockNavigate).toHaveBeenCalledWith('/users');
        });

        it('debe hacer login exitosamente como administrador', async () => {
            const mockToken = createMockToken('admin', true);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'admin',
                    password: 'admin123',
                });
            });

            expect(result.current.login).toEqual({
                isAuth: true,
                isAdmin: true,
                user: { username: 'admin' },
            });

            const savedLogin = JSON.parse(sessionStorage.getItem('login'));
            expect(savedLogin).toEqual({
                isAuth: true,
                isAdmin: true,
                user: { username: 'admin' },
            });
        });

        it('debe guardar el login en sessionStorage', async () => {
            const mockToken = createMockToken('testuser', false);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            const savedLogin = sessionStorage.getItem('login');
            expect(savedLogin).toBeTruthy();

            const parsedLogin = JSON.parse(savedLogin);
            expect(parsedLogin).toEqual({
                isAuth: true,
                isAdmin: false,
                user: { username: 'testuser' },
            });
        });

        it('debe guardar el token en sessionStorage con prefijo Bearer', async () => {
            const mockToken = createMockToken('testuser', false);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            expect(sessionStorage.getItem('token')).toBe(`Bearer ${mockToken}`);
        });

        it('debe mostrar error cuando las credenciales son inválidas (401)', async () => {
            loginUser.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'wronguser',
                    password: 'wrongpass',
                });
            });

            expect(Swal.fire).toHaveBeenCalledWith(
                'Error Login',
                'Username o password invalidos',
                'error'
            );

            expect(result.current.login.isAuth).toBe(false);
        });

        it('debe mostrar error cuando no tiene permisos (403)', async () => {
            loginUser.mockRejectedValue({ response: { status: 403 } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            expect(Swal.fire).toHaveBeenCalledWith(
                'Error Login',
                'No tiene acceso al recurso o permisos!',
                'error'
            );

            expect(result.current.login.isAuth).toBe(false);
        });

        it('debe lanzar error para otros códigos de error', async () => {
            const error = new Error('Server error');
            error.response = { status: 500 };
            loginUser.mockRejectedValue(error);

            const { result } = renderHook(() => useAuth(), { wrapper });

            await expect(async () => {
                await act(async () => {
                    await result.current.handlerLogin({
                        username: 'testuser',
                        password: 'password123',
                    });
                });
            }).rejects.toThrow('Server error');

            expect(Swal.fire).not.toHaveBeenCalled();
        });

        it('debe decodificar el token JWT correctamente', async () => {
            const mockToken = createMockToken('testuser', true);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            expect(console.log).toHaveBeenCalled();
            expect(result.current.login.user.username).toBe('testuser');
            expect(result.current.login.isAdmin).toBe(true);
        });
    });

    describe('handlerLogout', () => {
        it('debe hacer logout y limpiar sessionStorage', async () => {
            // Primero hacer login
            const mockToken = createMockToken('testuser', false);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'testuser',
                    password: 'password123',
                });
            });

            // Verificar que hay datos en sessionStorage
            expect(sessionStorage.getItem('token')).toBeTruthy();
            expect(sessionStorage.getItem('login')).toBeTruthy();

            // Hacer logout
            act(() => {
                result.current.handlerLogout();
            });

            expect(result.current.login).toEqual({
                isAuth: false,
                isAdmin: false,
                user: undefined,
            });

            expect(sessionStorage.getItem('token')).toBeNull();
            expect(sessionStorage.getItem('login')).toBeNull();
        });

        it('debe limpiar todo el sessionStorage', () => {
            sessionStorage.setItem('token', 'Bearer test');
            sessionStorage.setItem('login', JSON.stringify({ isAuth: true }));
            sessionStorage.setItem('otherData', 'someData');

            const { result } = renderHook(() => useAuth(), { wrapper });

            act(() => {
                result.current.handlerLogout();
            });

            expect(sessionStorage.getItem('token')).toBeNull();
            expect(sessionStorage.getItem('login')).toBeNull();
            expect(sessionStorage.getItem('otherData')).toBeNull();
        });

        it('debe cambiar el estado a logout', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            // Primero hacer login
            const mockToken = createMockToken('admin', true);
            loginUser.mockResolvedValue({ data: { token: mockToken } });

            await act(async () => {
                await result.current.handlerLogin({
                    username: 'admin',
                    password: 'admin123',
                });
            });

            // Estado después del login
            expect(result.current.login.isAuth).toBe(true);

            // Hacer logout
            act(() => {
                result.current.handlerLogout();
            });

            expect(result.current.login.isAuth).toBe(false);
            expect(result.current.login.isAdmin).toBe(false);
            expect(result.current.login.user).toBeUndefined();
        });
    });
});

// Función auxiliar para crear tokens JWT mock
function createMockToken(username, isAdmin) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: username, isAdmin: isAdmin }));
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
}