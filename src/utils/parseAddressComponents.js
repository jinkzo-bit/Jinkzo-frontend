/**
 * Parse Google Maps address_components array into a flat object.
 * Handles both full component arrays and already-parsed objects.
 */
export function parseAddressComponents(components) {
  if (!components || !Array.isArray(components)) {
    return {
      houseNo: '',
      street: '',
      area: '',
      villageTownCity: '',
      city: '',
      district: '',
      state: '',
      zip: '',
      pincode: '',
      country: '',
      pointOfInterest: '',
      placeName: ''
    };
  }

  const get = (type) => {
    const comp = components.find(c => c.types && c.types.includes(type));
    return comp ? comp.long_name : '';
  };

  const houseNo = get('street_number') || get('premise') || get('subpremise') || '';
  const street = get('route') || get('sublocality_level_2') || '';
  const area = get('sublocality_level_1') || get('sublocality') || get('neighborhood') || '';
  const villageTownCity = get('locality') || get('postal_town') || get('administrative_area_level_3') || '';
  const city = villageTownCity || get('administrative_area_level_2') || '';
  const district = get('administrative_area_level_2') || '';
  const state = get('administrative_area_level_1') || '';
  const pincode = get('postal_code') || '';
  const country = get('country') || '';
  const pointOfInterest = get('point_of_interest') || get('establishment') || '';

  return {
    houseNo,
    street,
    area,
    villageTownCity,
    city,
    district,
    state,
    zip: pincode,
    pincode,
    country,
    pointOfInterest,
    placeName: pointOfInterest
  };
}
