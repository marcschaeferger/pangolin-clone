import { ResponseT } from "@server/types/Response";

export const response = <T>({
    data,
    success,
    error,
    message,
    status,
}: ResponseT<T>) => {
    return {
        data,
        success,
        error,
        message,
        status,
    };
};

export default response;
