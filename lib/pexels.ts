/**
 * Pexels API Service
 * 
 * Busca imagens de alta qualidade via API do Pexels.
 * Usado tanto no PagesBuilder quanto no ArccoChat
 * para substituir placeholders por fotos reais.
 * 
 * Docs: https://www.pexels.com/api/documentation/
 */

const PEXELS_API_URL = 'https://api.pexels.com/v1';

export interface PexelsPhoto {
    id: number;
    width: number;
    height: number;
    url: string;           // Link para a página do Pexels
    photographer: string;
    photographer_url: string;
    alt: string;
    src: {
        original: string;
        large2x: string;     // 1880px
        large: string;       // 940px
        medium: string;      // 350px
        small: string;       // 130px
        portrait: string;    // 800x1200
        landscape: string;   // 1200x627
        tiny: string;        // 280x200
    };
}

export interface PexelsSearchResult {
    total_results: number;
    page: number;
    per_page: number;
    photos: PexelsPhoto[];
    next_page?: string;
}

class PexelsService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private getHeaders() {
        return {
            Authorization: this.apiKey,
        };
    }

    /**
     * Busca fotos por termo de pesquisa.
     * @param query - Termo de busca (ex: "business meeting", "tecnologia")
     * @param options - Opções extras: per_page, page, orientation, size, color
     */
    async searchPhotos(
        query: string,
        options: {
            per_page?: number;
            page?: number;
            orientation?: 'landscape' | 'portrait' | 'square';
            size?: 'large' | 'medium' | 'small';
            color?: string;
            locale?: string;
        } = {}
    ): Promise<PexelsSearchResult> {
        const params = new URLSearchParams({
            query,
            per_page: String(options.per_page || 5),
            page: String(options.page || 1),
        });

        if (options.orientation) params.set('orientation', options.orientation);
        if (options.size) params.set('size', options.size);
        if (options.color) params.set('color', options.color);
        if (options.locale) params.set('locale', options.locale);

        const response = await fetch(`${PEXELS_API_URL}/search?${params}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pexels API error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    /**
     * Busca fotos curadas (trending/populares).
     */
    async getCurated(perPage = 5, page = 1): Promise<PexelsSearchResult> {
        const params = new URLSearchParams({
            per_page: String(perPage),
            page: String(page),
        });

        const response = await fetch(`${PEXELS_API_URL}/curated?${params}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
        return response.json();
    }

    /**
     * Retorna uma foto específica pelo ID.
     */
    async getPhoto(id: number): Promise<PexelsPhoto> {
        const response = await fetch(`${PEXELS_API_URL}/photos/${id}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
        return response.json();
    }

    /**
     * Busca múltiplas queries e retorna um mapa de resultados.
     * Útil para o agente Builder buscar várias imagens de uma vez.
     * Ex: { "hero": "modern office", "team": "business team meeting" }
     * Retorna: { "hero": "https://...", "team": "https://..." }
     */
    async searchMultiple(
        queries: Record<string, string>,
        orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

        const entries = Object.entries(queries);
        // Executa em paralelo, máx 5 de cada vez
        const chunks = [];
        for (let i = 0; i < entries.length; i += 5) {
            chunks.push(entries.slice(i, i + 5));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(async ([key, query]) => {
                try {
                    const data = await this.searchPhotos(query, {
                        per_page: 1,
                        orientation,
                    });
                    if (data.photos.length > 0) {
                        results[key] = data.photos[0].src.large;
                    }
                } catch (e) {
                    console.warn(`[Pexels] Falha ao buscar "${query}":`, e);
                }
            });
            await Promise.all(promises);
        }

        return results;
    }

    /**
     * Busca uma única imagem e retorna a URL direta (large).
     * Retorna string vazia se não encontrar.
     */
    async quickSearch(query: string, orientation: 'landscape' | 'portrait' | 'square' = 'landscape'): Promise<string> {
        try {
            const data = await this.searchPhotos(query, { per_page: 1, orientation });
            return data.photos[0]?.src.large || '';
        } catch {
            return '';
        }
    }
}

// Instância global com a API key
export const pexelsService = new PexelsService('26CU1rMkQHVmTL9pWDeHgyWuaM2kRt5JbGqiyWtsNjTPSo0IfOBsjxL3');
