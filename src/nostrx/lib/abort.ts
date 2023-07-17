import { Observable } from "rxjs";

export function abort<T>(signal?: AbortSignal) {
    return (obs: Observable<T>) => signal ? new Observable<T>((sub) => {
        const onabort = () => sub.error(getAbortError(signal));
        if (signal.aborted) {
            onabort();
            return;
        }
        signal.addEventListener("abort", onabort);
        sub.add(() => signal.removeEventListener("abort", onabort));
        return obs.subscribe(sub);
    }) : obs;
}

export function getAbortError(signal: AbortSignal) {
    try {
        signal.throwIfAborted();
    } catch (ex) {
        return ex;
    }
}
