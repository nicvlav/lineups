export default {
    async fetch(request, env, ctx) {
        // For requests to HTML responses, remove CSP headers to allow Facebook OAuth
        const response = await env.ASSETS.fetch(request);
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            const headers = new Headers(response.headers);
            headers.delete('Content-Security-Policy');
            headers.delete('Content-Security-Policy-Report-Only');
            
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers
            });
        }
        
        return response;
    },
};