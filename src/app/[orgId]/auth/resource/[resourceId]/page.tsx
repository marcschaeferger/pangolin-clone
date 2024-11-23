import ResourceAuthPortal from "./components/ResourceAuthPortal";

export default async function ResourceAuthPage(props: {
    params: Promise<{ resourceId: number; orgId: string }>;
}) {
    const params = await props.params;

    console.log(params);

    return (
        <>
            <div className="p-3 md:mt-32">
                <ResourceAuthPortal />
            </div>
        </>
    );
}
