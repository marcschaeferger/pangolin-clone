type AuthLayoutProps = {
    children: React.ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <>
            <div className="mt-32">
                {children}
            </div>
        </>
    );
}
