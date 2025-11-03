import usersApi from "../api/usersApi.js";

const BASE_URL = '';

export const findAll = async() => {
    try {
        return await usersApi.get(BASE_URL);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export const save = async ({ username, email, password, admin }) => {
    try {
        return await usersApi.post(BASE_URL, {
            username,
            email,
            password,
            admin
        });
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export const update = async({ id, username, email, admin }) => {
    try{
        return await usersApi.put(`${BASE_URL}/${id}`, {
            username,
            email,
            admin,
        });
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export const remove = async (id) => {
    try {
        await usersApi.delete(`${BASE_URL}/${id}`);
    } catch (error) {
        console.log(error)
        throw error;
    }
}

