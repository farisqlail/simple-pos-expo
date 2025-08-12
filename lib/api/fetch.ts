const BASE_URL = "https://myprofit-pwa-api.azurewebsites.net/api";

export async function getResource<T = any>(
  endpoint: string,
  token: string
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: token, // ⬅️ token polos, JANGAN ditambah "Bearer "
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = new Error(
        `Fetch ${endpoint} failed (${response.status}). ${text}`
      ) as any;
      error.status = response.status;
      error.body = text;
      throw error;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function createResource<T = any>(
  endpoint: string,
  data: any,
  token: string
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
}

export async function createResourceFormData<T = any>(
  endpoint: string,
  data: FormData,
  token: string
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: token,
      },
      body: data,
    });

    return await response.json();
  } catch (error) {
    console.error("Error creating resource with form data:", error);
    throw error;
  }
}

export async function updateResource<T = any>(
  endpoint: string,
  data: any,
  token: string
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error("Error updating resource:", error);
    throw error;
  }
}

export async function updateResourceFormData<T = any>(
  endpoint: string,
  data: FormData,
  token: string
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: token,
      },
      body: data,
    });

    return await response.json();
  } catch (error) {
    console.error("Error updating resource with form data:", error);
    throw error;
  }
}

export async function deleteResource(
  endpoint: string,
  token: string
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}/${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
}

export async function postResource<T = any>(
  endpoint: string,
  data: any
): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error("Error posting resource:", error);
    throw error;
  }
}

export async function get<T = any>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = new Error(
        "An error occurred while fetching the resource."
      ) as any;
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function printWindows<T = any>(
  endpoint: string,
  dataPrint: any
): Promise<T> {
  try {
    const response = await fetch(`http://localhost:2145/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataPrint),
    });

    if (!response.ok) {
      const error = new Error(
        "An error occurred while fetching the resource."
      ) as any;
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// lib/api/fetch.ts
export type LoginResponse = {
  status: "success" | "error";
  message?: string;
  data?: {
    token?: string;
    user?: {
      appid: string;
      id: number;
      email: string;
      position: string;
      first_name: string;
      last_name: string;
      phone: string;
      default_lang: string;
      menu_can: string;
      location_can: string;
      android_can: string;
      show_all: "yes" | "no";
      disable_logout: boolean;
      is_done_onboarding: boolean;
    };
    data_register?: any[];
  };
};

// sudah ada:
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  return postResource<LoginResponse>("auth/login", { email, password });
}
