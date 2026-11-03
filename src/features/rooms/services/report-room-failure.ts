import { createFailureReporter, type ReportFailureOptions } from '@/lib/report-feature-failure';
import { toRoomError } from './room-errors';

export type ReportRoomOptions = ReportFailureOptions;

const reporter = createFailureReporter('rooms', toRoomError);

export const reportRoomFailure = reporter.report;
export const logAndRethrow = reporter.logAndRethrow;
