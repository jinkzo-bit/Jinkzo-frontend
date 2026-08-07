/**
 * Parses a Google Places API `address_components` array into our app's
 * address field structure.
 *
 * @param {Array} components - The address_components array from Google Places / Geocoding API
 * @returns {{ houseNo, street, area, city, state, zip }}
 */
export const parseAddressComponents = (components = []) => {
  const get = (...types) => {
    for (const type of types) {
      const comp = components.find((c) => c.types.includes(type));
      if (comp) return comp.long_name || '';
    }
    return '';
  };

  return {
    houseNo: get('street_number'),
    street:  get('route'),
    area:    get('sublocality_level_1', 'sublocality', 'neighborhood', 'sublocality_level_2'),
    city:    get('locality', 'administrative_area_level_2'),
    state:   get('administrative_area_level_1'),
    zip:     get('postal_code'),
  };
};
