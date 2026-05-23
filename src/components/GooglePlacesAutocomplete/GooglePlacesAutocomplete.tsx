import { useEffect, useRef, useState } from "react";
import "./GooglePlacesAutocomplete.css";

export interface PlaceResult {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipcode: string;
  location: {
    latitude: number;
    longitude: number;
  };
  formattedAddress: string;
}

interface Props {
  onPlaceSelect: (place: PlaceResult) => void;
  defaultValue?: string;
  placeholder?: string;
}

let loadPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (loadPromise) return loadPromise;
  if ((window as any).google?.maps?.places) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  const key = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Missing VITE_PUBLIC_GOOGLE_MAPS_API_KEY"));

  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
};

const GooglePlacesAutocomplete = ({
  onPlaceSelect,
  defaultValue = "",
  placeholder = "Search for an address...",
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const callbackRef = useRef(onPlaceSelect);
  callbackRef.current = onPlaceSelect;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScript()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const google = (window as any).google;
    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "gb" },
      fields: ["address_components", "geometry", "formatted_address"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.geometry?.location || !place.address_components) return;

      const get = (type: string) =>
        place.address_components.find((c: any) => c.types.includes(type))
          ?.long_name || "";

      const num = get("street_number");
      const route = get("route");

      callbackRef.current({
        addressLine1: num ? `${num} ${route}` : route,
        addressLine2: get("subpremise") || undefined,
        city:
          get("postal_town") ||
          get("locality") ||
          get("administrative_area_level_2"),
        zipcode: get("postal_code"),
        location: {
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        },
        formattedAddress: place.formatted_address || "",
      });
    });

    autocompleteRef.current = ac;
  }, [ready]);

  if (error) return <div className="places-error">{error}</div>;

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={defaultValue}
      placeholder={ready ? placeholder : "Loading Google Places..."}
      disabled={!ready}
      className="form-input places-input"
    />
  );
};

export default GooglePlacesAutocomplete;
