/**
 * Parse Google Maps address_components array into a flat object.
 * Handles both full component arrays and already-parsed objects.
 */
export function parseAddressComponents(components) {
  if (!components || !Array.isArray(components)) {
    return { houseNo: '', street: '', area: '', city: '', state: '', zip: '' };
  }

  const get = (type) => {
    const comp = components.find(c => c.types && c.types.includes(type));
    return comp ? comp.long_name : '';
  };

  return {
    houseNo: get('street_number') || get('premise') || '',
    street:  get('route') || get('sublocality_level_2') || '',
    area:    get('sublocality_level_1') || get('sublocality') || get('neighborhood') || '',
    city:    get('locality') || get('postal_town') || get('administrative_area_level_2') || '',
    state:   get('administrative_area_level_1') || '',
    zip:     get('postal_code') || '',
  };
}
