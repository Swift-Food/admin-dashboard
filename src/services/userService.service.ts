import http from "./http";

export const getUserById = async (id: string) => {
  const res = await http.get(`/user/${id}`);
  return res.data;
};
