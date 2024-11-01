import { handleError } from '../../util/error';
import type Client from '../../util/client';
import { parseArguments } from '../../util/get-args';
import getSubcommand from '../../util/get-subcommand';
import { type Command, help } from '../help';
import ls from './ls';
import rm from './rm';
import set from './set';
import { aliasCommand, listSubcommand } from './command';
import { getFlagsSpecification } from '../../util/get-flags-specification';
import { AliasTelemetryClient } from '../../util/telemetry/commands/alias';
import output from '../../output-manager';

const COMMAND_CONFIG = {
  ls: ['ls', 'list'],
  rm: ['rm', 'remove'],
  set: ['set'],
};

export default async function alias(client: Client) {
  const telemetry = new AliasTelemetryClient({
    opts: {
      store: client.telemetryEventStore,
    },
  });

  let parsedArguments;

  const flagsSpecification = getFlagsSpecification(aliasCommand.options);

  try {
    parsedArguments = parseArguments(client.argv.slice(2), flagsSpecification, {
      permissive: true,
    });
  } catch (err) {
    handleError(err);
    return 1;
  }

  const { subcommand, args, subcommandOriginal } = getSubcommand(
    parsedArguments.args.slice(1),
    COMMAND_CONFIG
  );

  const needHelp = parsedArguments.flags['--help'];

  if (!subcommand && needHelp) {
    telemetry.trackCliFlagHelp('alias');
    output.print(help(aliasCommand, { columns: client.stderr.columns }));
    return 2;
  }

  function printHelp(command: Command) {
    output.print(
      help(command, { parent: aliasCommand, columns: client.stderr.columns })
    );
  }

  switch (subcommand) {
    case 'ls':
      if (needHelp) {
        telemetry.trackCliFlagHelp('alias', 'list');
        printHelp(listSubcommand);
        return 2;
      }
      telemetry.trackCliSubcommandList(subcommandOriginal);
      return ls(client, args);
    case 'rm':
      telemetry.trackCliSubcommandRemove(subcommandOriginal);
      return rm(client, args);
    default:
      telemetry.trackCliSubcommandSet(subcommandOriginal);
      return set(client, args);
  }
}
