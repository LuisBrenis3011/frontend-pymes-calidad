import productosApi from "/src/api/productosApi.js";

const BASE_URL = '';

export const findByEmpresa = async (empresaId) => {
    try {
        return await productosApi.get(`/empresa/${empresaId}`);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const findById = async (id, empresaId) => {
    try {
        return await productosApi.get(`/${id}/empresa/${empresaId}`);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const save = async (empresaId, { nombre, descripcion, valorUnitario, unidadMedida }) => {
    try {
        return await productosApi.post(`/empresa/${empresaId}`, {
            nombre,
            descripcion,
            valorUnitario,
            unidadMedida
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const update = async (empresaId, { id, nombre, descripcion, valorUnitario, unidadMedida }) => {
    try {
        return await productosApi.put(`/${id}/empresa/${empresaId}`, {
            nombre,
            descripcion,
            valorUnitario,
            unidadMedida
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
};

export const remove = async (id, empresaId) => {
    try {
        await productosApi.delete(`/${id}/empresa/${empresaId}`);
    } catch (error) {
        console.log(error);
        throw error;
    }
};