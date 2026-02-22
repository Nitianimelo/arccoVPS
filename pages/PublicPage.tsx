import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PublicPageProps {
  slug: string;
}

export const PublicPage: React.FC<PublicPageProps> = ({ slug }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndRenderPage = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('pages_user')
          .select('codepages, nome, publicado')
          .eq('url_slug', slug)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Página não encontrada');
          } else {
            setError('Erro ao carregar página');
          }
          return;
        }

        if (!data.publicado) {
          setError('Esta página não está publicada');
          return;
        }

        // Replace entire document with the page HTML for maximum performance
        document.open();
        document.write(data.codepages);
        document.close();

      } catch (err) {
        console.error('Error fetching page:', err);
        setError('Erro ao carregar página');
      }
    };

    fetchAndRenderPage();
  }, [slug]);

  // Show error page if there's an error
  if (error) {
    return (
      <html lang="pt-BR">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{error}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{error}</h1>
            <p className="text-gray-500">Verifique se o endereço está correto</p>
          </div>
        </body>
      </html>
    );
  }

  // Show loading while fetching
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Carregando...</title>
        <style>{`
          body {
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #fff;
          }
          .loader {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </head>
      <body>
        <div className="loader"></div>
      </body>
    </html>
  );
};
