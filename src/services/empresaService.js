import empresasApi from "../api/empresasApi.js";

const BASE_URL = '';

export const findAll = async () => {
    try {
        const response = await empresasApi.get(BASE_URL);
        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const save = async ({ razonSocial, ruc, email, direccion }) => {

    try {
        // El username lo añade automáticamente el backend a partir del token
        return await empresasApi.post(BASE_URL, {
            razonSocial,
            ruc,
            email,
            direccion
        });
    } catch (error) {
        console.log(error)
        throw error;
    }
};

export const update = async ({ id, razonSocial, ruc, email, direccion }) => {

    try {
        return await empresasApi.put(`/${id}`, {
            razonSocial,
            ruc,
            email,
            direccion
        });
    } catch (error) {
        console.log(error)
        throw error;
    }
};

export const remove = async (id) => {

    try {
        await empresasApi.delete(`/${id}`);
    } catch (error) {
        console.log(error)
        throw error;
    }
};
