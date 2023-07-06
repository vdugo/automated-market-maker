import { createSlice } from "@reduxjs/toolkit";

export const provider = createSlice({
    name: 'provider',
    initialState: {
        connection: null,
        chainId: null,
        account: null
    },
    reducers: {
        
    }
})


export default provider.reducer