import { renderHook, act, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { useProductos } from '../useProductos';
import { findByEmpresa, save, update, remove } from '../../services/productoService';

// Mocks
jest.mock('../../services/productoService');
jest.mock('sweetalert2');

describe('useProductos Hook', () => {
    const mockEmpresaId = 1;

    beforeEach(() => {
        jest.clearAllMocks();
        Swal.fire.mockResolvedValue({ isConfirmed: true });
        console.error = jest.fn(); // Mock console.error
    });

    describe('Estado inicial', () => {
        it('debe tener el estado inicial correcto', () => {
            const { result } = renderHook(() => useProductos());

            expect(result.current.productos).toEqual([]);
            expect(result.current.productoSelected).toEqual({
                id: 0,
                nombre: '',
                descripcion: '',
                valorUnitario: '',
                unidadMedida: '',
            });
            expect(result.current.visibleForm).toBe(false);
            expect(result.current.errors).toEqual({});
        });
    });

    describe('getProductos', () => {
        it('debe cargar productos exitosamente', async () => {
            const mockProductos = [
                { id: 1, nombre: 'Producto 1', descripcion: 'Desc 1', valorUnitario: 100, unidadMedida: 'UND' },
                { id: 2, nombre: 'Producto 2', descripcion: 'Desc 2', valorUnitario: 200, unidadMedida: 'KG' },
            ];
            findByEmpresa.mockResolvedValue({ data: mockProductos });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.getProductos(mockEmpresaId);
            });

            expect(findByEmpresa).toHaveBeenCalledWith(mockEmpresaId);
            expect(result.current.productos).toEqual(mockProductos);
        });

        it('no debe hacer nada si empresaId es undefined', async () => {
            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.getProductos(undefined);
            });

            expect(findByEmpresa).not.toHaveBeenCalled();
        });

        it('no debe hacer nada si empresaId es null', async () => {
            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.getProductos(null);
            });

            expect(findByEmpresa).not.toHaveBeenCalled();
        });

        it('debe manejar errores al cargar productos', async () => {
            findByEmpresa.mockRejectedValue(new Error('Error al cargar'));

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.getProductos(mockEmpresaId);
            });

            expect(console.error).toHaveBeenCalledWith('Error al obtener productos:', expect.any(Error));
        });
    });

    describe('handlerAddProducto', () => {
        it('debe crear un nuevo producto exitosamente', async () => {
            const newProducto = {
                id: 0,
                nombre: 'Producto Nuevo',
                descripcion: 'Descripción nueva',
                valorUnitario: 150,
                unidadMedida: 'UND',
            };
            const savedProducto = { ...newProducto, id: 3 };
            save.mockResolvedValue({ data: savedProducto });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, newProducto);
            });

            expect(save).toHaveBeenCalledWith(mockEmpresaId, newProducto);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Producto creado',
                'El producto fue registrado con éxito',
                'success'
            );
            expect(result.current.visibleForm).toBe(false);
            expect(result.current.errors).toEqual({});
        });

        it('debe actualizar un producto existente exitosamente', async () => {
            const existingProducto = {
                id: 1,
                nombre: 'Producto Actualizado',
                descripcion: 'Descripción actualizada',
                valorUnitario: 250,
                unidadMedida: 'KG',
            };
            update.mockResolvedValue({ data: existingProducto });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, existingProducto);
            });

            expect(update).toHaveBeenCalledWith(mockEmpresaId, existingProducto);
            expect(Swal.fire).toHaveBeenCalledWith(
                'Producto actualizado',
                'El producto fue actualizado con éxito',
                'info'
            );
            expect(result.current.visibleForm).toBe(false);
        });

        it('debe validar que el nombre sea obligatorio', async () => {
            const invalidProducto = {
                id: 0,
                nombre: '',
                descripcion: 'Descripción',
                valorUnitario: 100,
                unidadMedida: 'UND',
            };

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, invalidProducto);
            });

            expect(result.current.errors.nombre).toBe('El nombre es obligatorio');
            expect(save).not.toHaveBeenCalled();
        });

        it('debe validar que la descripción sea obligatoria', async () => {
            const invalidProducto = {
                id: 0,
                nombre: 'Producto',
                descripcion: '',
                valorUnitario: 100,
                unidadMedida: 'UND',
            };

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, invalidProducto);
            });

            expect(result.current.errors.descripcion).toBe('La descripción es obligatoria');
            expect(save).not.toHaveBeenCalled();
        });

        it('debe validar que el valor unitario sea obligatorio', async () => {
            const invalidProducto = {
                id: 0,
                nombre: 'Producto',
                descripcion: 'Descripción',
                valorUnitario: '',
                unidadMedida: 'UND',
            };

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, invalidProducto);
            });

            expect(result.current.errors.valorUnitario).toBe('El valor unitario es obligatorio');
            expect(save).not.toHaveBeenCalled();
        });

        it('debe validar que la unidad de medida sea obligatoria', async () => {
            const invalidProducto = {
                id: 0,
                nombre: 'Producto',
                descripcion: 'Descripción',
                valorUnitario: 100,
                unidadMedida: '',
            };

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, invalidProducto);
            });

            expect(result.current.errors.unidadMedida).toBe('La unidad de medida es obligatoria');
            expect(save).not.toHaveBeenCalled();
        });

        it('debe validar múltiples campos al mismo tiempo', async () => {
            const invalidProducto = {
                id: 0,
                nombre: '',
                descripcion: '',
                valorUnitario: '',
                unidadMedida: '',
            };

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, invalidProducto);
            });

            expect(result.current.errors).toEqual({
                nombre: 'El nombre es obligatorio',
                descripcion: 'La descripción es obligatoria',
                valorUnitario: 'El valor unitario es obligatorio',
                unidadMedida: 'La unidad de medida es obligatoria',
            });
            expect(save).not.toHaveBeenCalled();
        });

        it('debe manejar error al crear producto', async () => {
            const producto = {
                id: 0,
                nombre: 'Producto',
                descripcion: 'Descripción',
                valorUnitario: 100,
                unidadMedida: 'UND',
            };
            save.mockRejectedValue(new Error('Error al guardar'));

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, producto);
            });

            expect(console.error).toHaveBeenCalled();
            expect(Swal.fire).toHaveBeenCalledWith('Error', 'No se pudo guardar el producto', 'error');
        });

        it('debe manejar error al actualizar producto', async () => {
            const producto = {
                id: 1,
                nombre: 'Producto',
                descripcion: 'Descripción',
                valorUnitario: 100,
                unidadMedida: 'UND',
            };
            update.mockRejectedValue(new Error('Error al actualizar'));

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerAddProducto(mockEmpresaId, producto);
            });

            expect(console.error).toHaveBeenCalled();
            expect(Swal.fire).toHaveBeenCalledWith('Error', 'No se pudo guardar el producto', 'error');
        });
    });

    describe('handlerRemoveProducto', () => {
        it('debe eliminar producto exitosamente cuando se confirma', async () => {
            remove.mockResolvedValue({});
            Swal.fire.mockResolvedValue({ isConfirmed: true });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerRemoveProducto(mockEmpresaId, 1);
            });

            await waitFor(() => {
                expect(remove).toHaveBeenCalledWith(mockEmpresaId, 1);
                expect(Swal.fire).toHaveBeenCalledWith('Eliminado', 'El producto fue eliminado', 'success');
            });
        });

        it('no debe eliminar producto si se cancela', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: false });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerRemoveProducto(mockEmpresaId, 1);
            });

            expect(remove).not.toHaveBeenCalled();
        });

        it('debe mostrar confirmación antes de eliminar', async () => {
            Swal.fire.mockResolvedValue({ isConfirmed: false });

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerRemoveProducto(mockEmpresaId, 1);
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

        it('debe manejar error al eliminar producto', async () => {
            Swal.fire.mockResolvedValueOnce({ isConfirmed: true });
            remove.mockRejectedValue(new Error('Error al eliminar'));

            const { result } = renderHook(() => useProductos());

            await act(async () => {
                await result.current.handlerRemoveProducto(mockEmpresaId, 1);
            });

            await waitFor(() => {
                expect(console.error).toHaveBeenCalled();
                expect(Swal.fire).toHaveBeenCalledWith('Error', 'No se pudo eliminar el producto', 'error');
            });
        });
    });

    describe('Form Handlers', () => {
        it('debe abrir el formulario', () => {
            const { result } = renderHook(() => useProductos());

            act(() => {
                result.current.handlerOpenForm();
            });

            expect(result.current.visibleForm).toBe(true);
        });

        it('debe cerrar el formulario y resetear estado', () => {
            const { result } = renderHook(() => useProductos());

            act(() => {
                result.current.handlerOpenForm();
                result.current.handlerCloseForm();
            });

            expect(result.current.visibleForm).toBe(false);
            expect(result.current.productoSelected).toEqual({
                id: 0,
                nombre: '',
                descripcion: '',
                valorUnitario: '',
                unidadMedida: '',
            });
        });

        it('debe seleccionar producto para editar', () => {
            const producto = {
                id: 1,
                nombre: 'Producto Test',
                descripcion: 'Descripción Test',
                valorUnitario: 100,
                unidadMedida: 'UND',
            };

            const { result } = renderHook(() => useProductos());

            act(() => {
                result.current.handlerProductoSelectedForm(producto);
            });

            expect(result.current.visibleForm).toBe(true);
            expect(result.current.productoSelected).toEqual(producto);
        });
    });
});