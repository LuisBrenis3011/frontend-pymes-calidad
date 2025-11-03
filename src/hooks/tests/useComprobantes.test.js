import { renderHook, act, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { useComprobantes } from '../useComprobantes';

// Mocks
jest.mock('sweetalert2');

describe('useComprobantes Hook', () => {
    const mockEmpresaId = 1;
    const STORAGE_KEY = `comprobantes_empresa_${mockEmpresaId}`;

    // Mock de localStorage
    const localStorageMock = (() => {
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
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        Swal.fire.mockResolvedValue({ isConfirmed: true });
        console.error = jest.fn();
    });

    describe('Estado inicial', () => {
        it('debe tener el estado inicial correcto', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            expect(result.current.comprobantes).toEqual([]);
            expect(result.current.comprobanteSelected).toMatchObject({
                id: 0,
                tipo: 'BOLETA',
                clienteNombre: '',
                clienteDocumento: '',
                items: [],
                total: 0,
            });
            expect(result.current.visibleForm).toBe(false);
            expect(result.current.errors).toEqual({});
        });
    });

    describe('getComprobantes y useEffect', () => {
        it('debe cargar comprobantes desde localStorage al inicializar', () => {
            const mockComprobantes = [
                {
                    id: 1,
                    tipo: 'BOLETA',
                    numeroComprobante: 'B001-00001',
                    fecha: '2024-01-01',
                    clienteNombre: 'Cliente 1',
                    clienteDocumento: '12345678',
                    items: [],
                    total: 100,
                },
            ];

            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockComprobantes));

            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            expect(result.current.comprobantes).toEqual(mockComprobantes);
        });

        it('debe inicializar con array vacío si no hay datos en localStorage', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            expect(result.current.comprobantes).toEqual([]);
        });

        it('debe manejar error al cargar desde localStorage', () => {
            localStorage.setItem(STORAGE_KEY, 'invalid json');

            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            // El hook debería inicializar con array vacío cuando hay error
            expect(result.current.comprobantes).toEqual([]);
            expect(console.error).toHaveBeenCalledWith('Error al cargar comprobantes:', expect.any(SyntaxError));
        });

        it('debe recargar comprobantes cuando cambia empresaId', () => {
            const { result, rerender } = renderHook(
                ({ empresaId }) => useComprobantes(empresaId),
                { initialProps: { empresaId: 1 } }
            );

            const comprobantesEmpresa1 = [{ id: 1, tipo: 'BOLETA' }];
            localStorage.setItem('comprobantes_empresa_1', JSON.stringify(comprobantesEmpresa1));

            rerender({ empresaId: 2 });

            const comprobantesEmpresa2 = [{ id: 2, tipo: 'FACTURA' }];
            localStorage.setItem('comprobantes_empresa_2', JSON.stringify(comprobantesEmpresa2));

            act(() => {
                result.current.getComprobantes();
            });
        });
    });

    describe('handlerAddComprobante', () => {
        it('debe crear un nuevo comprobante tipo BOLETA', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const nuevoComprobante = {
                id: 0,
                tipo: 'BOLETA',
                numeroComprobante: '',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [{ id: 1, nombre: 'Producto 1', cantidad: 1, precio: 100 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            expect(result.current.comprobantes).toHaveLength(1);
            expect(result.current.comprobantes[0]).toMatchObject({
                tipo: 'BOLETA',
                numeroComprobante: 'B001-00001',
                clienteNombre: 'Cliente Test',
                empresaId: mockEmpresaId,
            });
            expect(Swal.fire).toHaveBeenCalledWith(
                'Comprobante creado',
                'BOLETA B001-00001 creada con éxito',
                'success'
            );
        });

        it('debe crear un nuevo comprobante tipo FACTURA', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const nuevoComprobante = {
                id: 0,
                tipo: 'FACTURA',
                numeroComprobante: '',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678901',
                items: [{ id: 1, nombre: 'Producto 1', cantidad: 1, precio: 100 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            expect(result.current.comprobantes[0].numeroComprobante).toBe('F001-00001');
            expect(result.current.comprobantes[0].tipo).toBe('FACTURA');
        });

        it('debe generar número de comprobante consecutivo', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobante1 = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente 1',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobante1);
            });

            const comprobante2 = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente 2',
                clienteDocumento: '87654321',
                items: [{ id: 1 }],
                total: 200,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobante2);
            });

            expect(result.current.comprobantes[0].numeroComprobante).toBe('B001-00001');
            expect(result.current.comprobantes[1].numeroComprobante).toBe('B001-00002');
        });

        it('debe actualizar un comprobante existente', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobanteInicial = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Original',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteInicial);
            });

            const comprobanteId = result.current.comprobantes[0].id;

            const comprobanteActualizado = {
                ...result.current.comprobantes[0],
                clienteNombre: 'Cliente Actualizado',
                total: 200,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteActualizado);
            });

            expect(result.current.comprobantes).toHaveLength(1);
            expect(result.current.comprobantes[0].clienteNombre).toBe('Cliente Actualizado');
            expect(Swal.fire).toHaveBeenCalledWith(
                'Comprobante actualizado',
                'El comprobante fue actualizado con éxito',
                'info'
            );
        });

        it('debe guardar en localStorage al crear', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const nuevoComprobante = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            const stored = localStorage.getItem(STORAGE_KEY);
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored);
            expect(parsed).toHaveLength(1);
        });

        it('debe validar clienteNombre obligatorio', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobanteInvalido = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: '',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteInvalido);
            });

            expect(result.current.errors.clienteNombre).toBe('El nombre del cliente es obligatorio');
            expect(result.current.comprobantes).toHaveLength(0);
        });

        it('debe validar clienteDocumento obligatorio', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobanteInvalido = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteInvalido);
            });

            expect(result.current.errors.clienteDocumento).toBe('El documento del cliente es obligatorio');
            expect(result.current.comprobantes).toHaveLength(0);
        });

        it('debe validar que haya al menos un item', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobanteInvalido = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [],
                total: 0,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteInvalido);
            });

            expect(result.current.errors.items).toBe('Debe agregar al menos un producto');
            expect(result.current.comprobantes).toHaveLength(0);
        });

        it('debe validar múltiples campos al mismo tiempo', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobanteInvalido = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: '',
                clienteDocumento: '',
                items: [],
                total: 0,
            };

            act(() => {
                result.current.handlerAddComprobante(comprobanteInvalido);
            });

            expect(result.current.errors).toEqual({
                clienteNombre: 'El nombre del cliente es obligatorio',
                clienteDocumento: 'El documento del cliente es obligatorio',
                items: 'Debe agregar al menos un producto',
            });
        });

        it('debe continuar aunque falle guardar en localStorage', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            // Simular error en el mock de localStorage
            const originalSetItem = localStorageMock.setItem;
            localStorageMock.setItem = jest.fn(() => {
                throw new Error('Storage error');
            });

            const nuevoComprobante = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            // El comprobante se agrega al estado aunque falle localStorage
            expect(result.current.comprobantes).toHaveLength(1);
            expect(console.error).toHaveBeenCalledWith('Error al guardar en localStorage:', expect.any(Error));

            // Restaurar setItem original
            localStorageMock.setItem = originalSetItem;
        });
    });

    describe('handlerRemoveComprobante', () => {
        it('debe eliminar comprobante cuando se confirma', async () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            // Crear un comprobante primero
            const nuevoComprobante = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            const comprobanteId = result.current.comprobantes[0].id;

            Swal.fire.mockResolvedValue({ isConfirmed: true });

            await act(async () => {
                await result.current.handlerRemoveComprobante(comprobanteId);
            });

            await waitFor(() => {
                expect(result.current.comprobantes).toHaveLength(0);
                expect(Swal.fire).toHaveBeenCalledWith('Eliminado', 'El comprobante fue eliminado', 'success');
            });
        });

        it('no debe eliminar comprobante si se cancela', async () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const nuevoComprobante = {
                id: 0,
                tipo: 'BOLETA',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678',
                items: [{ id: 1 }],
                total: 100,
            };

            act(() => {
                result.current.handlerAddComprobante(nuevoComprobante);
            });

            const comprobanteId = result.current.comprobantes[0].id;

            Swal.fire.mockResolvedValue({ isConfirmed: false });

            await act(async () => {
                await result.current.handlerRemoveComprobante(comprobanteId);
            });

            expect(result.current.comprobantes).toHaveLength(1);
        });

        it('debe mostrar confirmación antes de eliminar', async () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            Swal.fire.mockResolvedValue({ isConfirmed: false });

            await act(async () => {
                await result.current.handlerRemoveComprobante(1);
            });

            expect(Swal.fire).toHaveBeenCalledWith({
                title: '¿Estás seguro?',
                text: 'No podrás revertir esto',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
            });
        });
    });

    describe('Form Handlers', () => {
        it('debe abrir el formulario con fecha actual', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const fechaHoy = new Date().toISOString().split('T')[0];

            act(() => {
                result.current.handlerOpenForm();
            });

            expect(result.current.visibleForm).toBe(true);
            expect(result.current.comprobanteSelected.fecha).toBe(fechaHoy);
        });

        it('debe cerrar el formulario y resetear estado', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            act(() => {
                result.current.handlerOpenForm();
                result.current.handlerCloseForm();
            });

            expect(result.current.visibleForm).toBe(false);
            expect(result.current.comprobanteSelected).toMatchObject({
                id: 0,
                tipo: 'BOLETA',
                clienteNombre: '',
                clienteDocumento: '',
                items: [],
                total: 0,
            });
            expect(result.current.errors).toEqual({});
        });

        it('debe seleccionar comprobante para editar', () => {
            const { result } = renderHook(() => useComprobantes(mockEmpresaId));

            const comprobante = {
                id: 1,
                tipo: 'FACTURA',
                numeroComprobante: 'F001-00001',
                fecha: '2024-01-01',
                clienteNombre: 'Cliente Test',
                clienteDocumento: '12345678901',
                items: [{ id: 1 }],
                total: 500,
            };

            act(() => {
                result.current.handlerComprobanteSelectedForm(comprobante);
            });

            expect(result.current.visibleForm).toBe(true);
            expect(result.current.comprobanteSelected).toEqual(comprobante);
        });
    });
});