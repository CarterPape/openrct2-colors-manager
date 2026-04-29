import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { get as _get } from 'https';

const request = {
    get: (url) =>
        new Promise((resolve, reject) => {
            const req = _get(url, (res) => {
                let result = '';

                res.on('error', reject);

                res.on('data', (chunk) => {
                    result += chunk;
                });

                res.on('end', () => {
                    resolve(result);
                });
            });

            req.on('error', reject);
            req.end();
        }),
};

(async () => {
    const apiDeclarationFileData = await request.get(
        'https://raw.githubusercontent.com/OpenRCT2/OpenRCT2/develop/distribution/openrct2.d.ts'
    );

    await mkdir(join(process.cwd(), 'lib'), { recursive: true });
    await writeFile(join(process.cwd(), 'lib', 'openrct2.d.ts'), apiDeclarationFileData);
})();
