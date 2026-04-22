const https = require('https');

class CountryAPI {
    /**
     * Busca información de un país por nombre usando REST Countries API
     * @param {string} name - Nombre del país (en inglés o común)
     * @returns {Promise<Object|null>}
     */
    static async fetchCountryData(query) {
        return new Promise((resolve, reject) => {
            // Si el query tiene 2 letras, asumimos que es un código ISO (alpha)
            const isCode = query.length === 2;
            const endpoint = isCode ? `alpha/${query}` : `name/${encodeURIComponent(query)}?fullText=true`;
            const url = `https://restcountries.com/v3.1/${endpoint}`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            return resolve(null);
                        }
                        const json = JSON.parse(data);
                        if (!json) return resolve(null);
                        
                        // La API devuelve un array para /name y un objeto para /alpha
                        const country = Array.isArray(json) ? json[0] : json;
                        if (!country) return resolve(null);
                        // Extraemos lo que necesitamos
                        const currencyCode = Object.keys(country.currencies || {})[0];
                        const currency = country.currencies?.[currencyCode];
                        
                        // Intentamos inferir un locale (ej: es-CO)
                        const languages = Object.keys(country.languages || {});
                        const firstLang = languages[0] || 'en';
                        const locale = `${firstLang}-${country.cca2}`;

                        resolve({
                            name: country.name.common,
                            code: country.cca2,
                            currency_code: currencyCode || 'USD',
                            currency_symbol: currency?.symbol || '$',
                            timezone: country.timezones?.[0] || 'UTC',
                            flag_url: country.flags?.png || country.flags?.svg,
                            locale: locale,
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Lista todos los países (para el dropdown del Gerente)
     */
    static async listAllCountries() {
        return new Promise((resolve, reject) => {
            const url = `https://restcountries.com/v3.1/all?fields=name,flags,cca2`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.map(c => ({
                            name: c.name.common,
                            flag: c.flags.png,
                            code: c.cca2
                        })).sort((a,b) => a.name.localeCompare(b.name)));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = CountryAPI;
