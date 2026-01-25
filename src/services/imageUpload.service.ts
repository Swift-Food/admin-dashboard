import { BASE_URL } from "../constants";

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/image-upload`, {
    method: "POST",
    headers,
    body: formData,
    
  });
  console.log("response is", JSON.stringify(response))
  if (!response.ok) {
    throw new Error("Failed to upload image");
  }

  const imageData = await response.json();
  return imageData.url || imageData.imageUrl || imageData;
};
