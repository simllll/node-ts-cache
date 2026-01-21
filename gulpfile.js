import { parallel, task } from 'gulp';
import { deleteAsync } from 'del';
import { glob } from 'glob';
import { execSync } from 'child_process';

task('cleanModules', function () {
	return deleteAsync(['./ts-cache/node_modules', './storages/*/node_modules']);
});

task('cleanTmp', function () {
	return deleteAsync(['./ts-cache/.tmp', './storages/*/.tmp']);
});

task('cleanDist', function () {
	return deleteAsync(['./ts-cache/dist', './storages/*/dist']);
});

task('updatePackages', async function () {
	const check = pkgJsonPath => {
		try {
			return execSync(`npx ncu --packageFile ${pkgJsonPath} -u`).toString();
		} catch (error) {
			console.log(`exec error: ${error.message}`);
			process.exit(error.status);
		}
	};

	const files = await glob('./**/*/package.json');
	for (const file of files) {
		if (file.includes('node_modules')) {
			continue;
		}
		console.log(check(file));
	}
});

export const superclean = parallel('cleanDist', 'cleanTmp', 'cleanModules');

export const clean = parallel('cleanDist', 'cleanTmp');
