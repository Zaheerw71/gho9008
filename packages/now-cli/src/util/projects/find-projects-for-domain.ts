import chalk from 'chalk';
import Client from '../client';
import wait from '../output/wait';
import { Project } from '../../types';
import { URLSearchParams } from 'url';

export async function findProjectsForDomain(
  client: Client,
  domainName: string
): Promise<Project[] | Error> {
  const cancelWait = wait(
    `Searching project for domain ${chalk.bold(domainName)}`
  );
  try {
    const limit = 50;
    let result: Project[] = [];

    const query = new URLSearchParams({
      hasProductionDomains: '1',
      limit: limit.toString(),
      domain: domainName,
    });

    for (;;) {
      const response = await client.fetch<Project[]>(`/v2/projects/?${query}`);
      result.push(...response);

      const [latest] = response.sort((a, b) => b.updatedAt - a.updatedAt);
      query.append('from', latest.updatedAt.toString());

      if (response.length !== limit) break;
    }

    return result;
  } catch (err) {
    if (err.status < 500) {
      return err;
    }

    throw err;
  } finally {
    cancelWait();
  }
}
