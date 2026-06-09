export const fetchLocationSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { query, country } = req.query; // Now accepting a dynamic country code
  
  if (!query || (query as string).length < 3) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    // If the frontend sends a country code (e.g., 'in', 'us', 'gb'), we inject it. 
    // If the user denied GPS permissions, it defaults to a global search.
    const countryFilter = country ? `&countrycodes=${(country as string).toLowerCase()}` : '';
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query as string)}${countryFilter}&limit=8&addressdetails=1`;
    
    const mapResponse = await fetch(targetUrl, { 
      headers: { 'User-Agent': 'PactEnterpriseCarpoolEngine/3.0.0' } 
    });
    
    const elements = (await mapResponse.json()) as any[];
    
    const structuredSuggestions = elements.map((item: any) => {
      const parts = item.display_name.split(',');
      const shortTitle = parts[0];
      const subLocality = parts[1] ? parts[1].trim() : '';
      
      return {
        displayName: `${shortTitle}, ${subLocality}`.replace(/,\s*$/, ""),
        fullAddress: item.display_name,
        lat: item.lat,
        lon: item.lon
      };
    });

    res.json({ suggestions: structuredSuggestions });
  } catch (err) {
    res.status(500).json({ error: 'Error resolving spatial map data.' });
  }
};
