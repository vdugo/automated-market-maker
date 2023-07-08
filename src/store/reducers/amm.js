import { createSlice } from "@reduxjs/toolkit";

export const amm = createSlice({
    name: 'amm',
    initialState: {
        contract: null,
        shares: null,
        swap: null
    },
    reducers: {
        setContract: (state, action) => {
            state.contract = action.payload
        },
    }
})

export const { setContract } = amm.actions

export default amm.reducer