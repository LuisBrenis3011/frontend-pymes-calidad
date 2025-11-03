import { renderHook, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useEmpresas } from '../useEmpresas';
import { findAll, save, update, remove } from '../../services/empresaService';
import { AuthContext } from '../../auth/context/AuthContext';

// Mocks
jest.mock('../../services/empresaService');
jest.mock('sweetalert2');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

describe('useEmpresas Hook', () => {
    const mockNavigate = jest.fn();
    const mockHandlerLogout = jest.fn();

    // Mock manual de useNavigate
    beforeAll(() => {
        // eslint-disable-next-line no-undef
        jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    });

    const wrapper = ({ children }) => (
        <AuthContext.Provider value={{ handlerLogout: mockHandlerLogout }}>
            <BrowserRouter>{children}</BrowserRouter>
        </AuthContext.Provider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
        Swal.fire.mockResolvedValue({ isConfirmed: true });
    });

    describe('Estado inicial', () => {
        it('debe tener el estado inicial correcto', () => {
            const { result } = renderHook(() => useEmpresas(), { wrapper });

            expect(result.current.empresas).toEqual([]);
            expect(result.current.empresaSelected).toEqual({
                id: 0,
                razonSocial: '',
                ruc: '',
                email: '',
                direccion: '',
            });
            expect(result.current.visibleForm).toBe(false);
            expect(result.current.errors).toEqual({
                razonSocial: '',
                ruc: '',
                email: '',
            });
        });
    });

    describe('getEmpresas', () => {
        it('debe cargar empresas exitosamente', async () => {
            const mockEmpresas = [
                { id: 1, razonSocial: 'Empresa 1', ruc: '12345678901', email: 'empresa1@test.com', direccion: 'Dir 1' },
                { id: 2, razonSocial: 'Empresa 2', ruc: '98765432109', email: 'empresa2@test.com', direccion: 'Dir 2' },
            ];
            findAll.mockResolvedValue({ data: mockEmpresas });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.getEmpresas();
            });

            expect(findAll).toHaveBeenCalledTimes(1);
            expect(result.current.empresas).toEqual(mockEmpresas);
        });

        it('debe llamar handlerLogout en error 401', async () => {
            findAll.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.getEmpresas();
            });

            expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
        });

        it('no debe llamar handlerLogout en otros errores', async () => {
            findAll.mockRejectedValue({ response: { status: 500 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.getEmpresas();
            });

            expect(mockHandlerLogout).not.toHaveBeenCalled();
        });
    });

    describe('handlerAddEmpresa', () => {
        it('debe crear una nueva empresa exitosamente', async () => {
            const newEmpresa = {
                id: 0,
                razonSocial: 'Nueva Empresa',
                ruc: '12345678901',
                email: 'nueva@test.com',
                direccion: 'Dirección Nueva',
            };
            const savedEmpresa = { ...newEmpresa, id: 3 };
            save.mockResolvedValue({ data: savedEmpresa });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerAddEmpresa(newEmpresa);
            });

            expect(save).toHaveBeenCalledWith(newEmpresa);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Empresa Creada',
                'La empresa ha sido registrada con éxito!',
                'success'
            );
            expect(result.current.visibleForm).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith('/empresas');
        });

        it('debe actualizar una empresa existente exitosamente', async () => {
            const existingEmpresa = {
                id: 1,
                razonSocial: 'Empresa Actualizada',
                ruc: '98765432109',
                email: 'actualizada@test.com',
                direccion: 'Dirección Actualizada',
            };
            update.mockResolvedValue({ data: existingEmpresa });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerAddEmpresa(existingEmpresa);
            });

            expect(update).toHaveBeenCalledWith(existingEmpresa);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Empresa Actualizada',
                'La empresa ha sido actualizada correctamente!',
                'success'
            );
            expect(result.current.visibleForm).toBe(false);
            expect(mockNavigate).toHaveBeenCalledWith('/empresas');
        });

        it('debe manejar errores de validación 400', async () => {
            const validationErrors = {
                razonSocial: 'La razón social es obligatoria',
                ruc: 'El RUC debe tener 11 dígitos',
                email: 'Email inválido',
            };
            save.mockRejectedValue({
                response: { status: 400, data: validationErrors },
            });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerAddEmpresa({ id: 0, razonSocial: '' });
            });

            expect(result.current.errors).toEqual(validationErrors);
            expect(Swal.fire).not.toHaveBeenCalled();
        });

        it('debe llamar handlerLogout en error 401', async () => {
            save.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerAddEmpresa({ id: 0, razonSocial: 'Test' });
            });

            expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
        });

        it('debe lanzar error en otros casos', async () => {
            const error = new Error('Error desconocido');
            save.mockRejectedValue(error);

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await expect(async () => {
                await act(async () => {
                    await result.current.handlerAddEmpresa({ id: 0, razonSocial: 'Test' });
                });
            }).rejects.toThrow('Error desconocido');
        });

        it('debe manejar error 401 al actualizar', async () => {
            update.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerAddEmpresa({ id: 1, razonSocial: 'Test' });
            });

            expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
        });
    });

    describe('handlerRemoveEmpresa', () => {
        it('debe eliminar empresa exitosamente cuando se confirma', async () => {
            remove.mockResolvedValue({});
            Swal.fire.mockResolvedValue({ isConfirmed: true });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveEmpresa(1);
            });

            await waitFor(() => {
                expect(remove).toHaveBeenCalledWith(1);
                expect(Swal.fire).toHaveBeenCalledWith(
                    'Eliminada!',
                    'La empresa fue eliminada con éxito.',
                    'success'
                );
            });
        });

        it('no debe eliminar empresa si se cancela', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: false });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveEmpresa(1);
            });

            expect(remove).not.toHaveBeenCalled();
        });

        it('debe mostrar confirmación antes de eliminar', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: false });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveEmpresa(1);
            });

            expect(Swal.fire).toHaveBeenCalledWith({
                title: '¿Seguro que deseas eliminar la empresa?',
                text: 'Esta acción no se puede deshacer!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar!',
                cancelButtonText: 'Cancelar',
            });
        });

        it('debe llamar handlerLogout en error 401 al eliminar', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: true });
            remove.mockRejectedValue({ response: { status: 401 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveEmpresa(1);
            });

            await waitFor(() => {
                expect(mockHandlerLogout).toHaveBeenCalledTimes(1);
            });
        });

        it('no debe llamar handlerLogout en otros errores al eliminar', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: true });
            remove.mockRejectedValue({ response: { status: 500 } });

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            await act(async () => {
                await result.current.handlerRemoveEmpresa(1);
            });

            await waitFor(() => {
                expect(mockHandlerLogout).not.toHaveBeenCalled();
            });
        });
    });

    describe('Form Handlers', () => {
        it('debe abrir el formulario', () => {
            const { result } = renderHook(() => useEmpresas(), { wrapper });

            act(() => {
                result.current.handlerOpenForm();
            });

            expect(result.current.visibleForm).toBe(true);
        });

        it('debe cerrar el formulario y resetear estado', () => {
            const { result } = renderHook(() => useEmpresas(), { wrapper });

            act(() => {
                result.current.handlerOpenForm();
                result.current.handlerCloseForm();
            });

            expect(result.current.visibleForm).toBe(false);
            expect(result.current.empresaSelected).toEqual({
                id: 0,
                razonSocial: '',
                ruc: '',
                email: '',
                direccion: '',
            });
            expect(result.current.errors).toEqual({});
        });

        it('debe seleccionar empresa para editar', () => {
            const empresa = {
                id: 1,
                razonSocial: 'Empresa Test',
                ruc: '12345678901',
                email: 'test@test.com',
                direccion: 'Dirección Test',
            };

            const { result } = renderHook(() => useEmpresas(), { wrapper });

            act(() => {
                result.current.handlerEmpresaSelectedForm(empresa);
            });

            expect(result.current.visibleForm).toBe(true);
            expect(result.current.empresaSelected).toEqual(empresa);
        });
    });
});