import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@app/components/ui/card";

export default async function ResourceAccessDenied() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    Access Denied
                </CardTitle>
            </CardHeader>
            <CardContent>
                You're not alowed to access this resource. If this is a mistake,
                please contact the administrator.
            </CardContent>
        </Card>
    );
}
