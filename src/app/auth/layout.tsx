type AuthLayoutProps = {
    children: React.ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <>
            <div className="p-3 md:mt-32">
                {children}
            </div>
        </>
    );
}
