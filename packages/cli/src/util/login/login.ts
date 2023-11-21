import Client from '../client';
import { InvalidEmail, AccountNotFound, isAPIError } from '../errors-ts';
import { errorToString } from '@vercel/error-utils';
import { LoginData } from './types';

export default async function login(
  client: Client,
  email: string
): Promise<LoginData> {
  try {
    return await client.fetch<LoginData>(`/registration?mode=login`, {
      method: 'POST',
      body: { email },
    });
  } catch (err: unknown) {
    if (isAPIError(err)) {
      if (err.code === 'not_exists') {
        throw new AccountNotFound(
          email,
          `Please sign up: https://vercel.com/signup`
        );
      }

      if (err.code === 'invalid_email' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new InvalidEmail(email, err.message);
      }
    }

    throw new Error(`Unexpected error: ${errorToString(err)}`);
  }
}
