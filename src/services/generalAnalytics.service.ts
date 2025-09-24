import http from "./http";
import type { GeneralAnalytics } from "../types/generalAnalytics.type";

const getGeneralAnalytics = async (): Promise<GeneralAnalytics> => {
    const res = await http.get<GeneralAnalytics>('/general-analytics');
    console.log('General Analytics Data:', res.data); 
    return res.data;
}

export default {
    getGeneralAnalytics
};