import type { APIRoute } from 'astro';

export const prerender = false;

const installerUrl =
  'https://raw.githubusercontent.com/admirable-oss/hive/main/distribution/install.sh';

export const GET: APIRoute = async () => {
  try {
    const installer = await fetch(installerUrl, {
      headers: { 'User-Agent': 'hive-website-installer' },
    });

    if (!installer.ok) {
      return new Response('Hive installer is temporarily unavailable. Please try again later.\n', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(await installer.text(), {
      headers: {
        'Content-Type': 'text/x-shellscript; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response('Hive installer is temporarily unavailable. Please try again later.\n', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
};
