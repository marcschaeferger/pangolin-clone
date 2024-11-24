import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@app/components/ui/card";

export default async function ResourceNotFound() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    Resource Not Found
                </CardTitle>
            </CardHeader>
            <CardContent>
                The resource you're trying to access does not exist
            </CardContent>
        </Card>
    );
}
