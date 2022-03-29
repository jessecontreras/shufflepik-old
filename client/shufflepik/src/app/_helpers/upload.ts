import {
  HttpEvent,
  HttpEventType,
  HttpProgressEvent,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { distinctUntilChanged, scan } from 'rxjs/operators';

/**
 *
 * @param event
 * @returns
 */
function isHttpResponse<T>(event: HttpEvent<T>): event is HttpResponse<T> {
  console.log('Inside of is http response');
  console.log(event);
  return event.type === HttpEventType.Response;
}

/**
 * Distinguishes different types of events.
 * @param event - Event in progress
 * @returns - Upload or download event
 */
function isHttpProgressEvent(
  event: HttpEvent<unknown>
): event is HttpProgressEvent {
  return (
    event.type === HttpEventType.DownloadProgress ||
    event.type === HttpEventType.UploadProgress
  );
}

/**
 * Our upload state.
 * Will define intermediate states calculated from existing state and incoming HttpEvent
 */
export interface Upload {
  progress: number;
  state: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  http_response?: any;
}

/**
 *
 * @returns
 */
export function upload(): (
  source: Observable<HttpEvent<unknown>>
) => Observable<Upload> {
  //Initial state of our download/uploas
  const initialState: Upload = { state: 'PENDING', progress: 0 };

  const calculateState = (
    upload: Upload,
    event: HttpEvent<unknown>
  ): Upload => {
    if (isHttpProgressEvent(event)) {
      return {
        progress: event.total
          ? Math.round((100 * event.loaded) / event.total)
          : upload.progress,
        state: 'IN_PROGRESS',
      };
    }
    if (isHttpResponse(event)) {
      return {
        progress: 100,
        http_response: event.body,
        state: 'DONE',
      };
    }
    return upload;
  };
  return (source) =>
    source.pipe(
      scan(calculateState, initialState),
      distinctUntilChanged(
        (a, b) => a.state === b.state && a.progress === b.progress
      )
    );
}
