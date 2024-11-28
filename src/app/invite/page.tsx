import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { verifySession } from "@app/lib/auth/verifySession";
import { AcceptInviteResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import InviteStatusCard from "./InviteStatusCard";
import { formatAxiosError } from "@app/lib/utils";

export default async function InvitePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams;

    const tokenParam = params.token as string;

    if (!tokenParam) {
        redirect("/");
    }

    const user = await verifySession();

    if (!user) {
        redirect(`/?redirect=/invite?token=${params.token}`);
    }

    const parts = tokenParam.split("-");
    if (parts.length !== 2) {
        return (
            <>
                <h1>Invalid Invite</h1>
                <p>The invite link is invalid.</p>
            </>
        );
    }

    const inviteId = parts[0];
    const token = parts[1];

    let error = "";
    const res = await internal
        .post<AxiosResponse<AcceptInviteResponse>>(
            `/invite/accept`,
            {
                inviteId,
                token,
            },
            await authCookieHeader()
        )
        .catch((e) => {
            console.error(e);
            error = formatAxiosError(e);
        });

    if (res && res.status === 200) {
        redirect(`/${res.data.data.orgId}`);
    }

    function cardType() {
        if (error.includes("Invite is not for this user")) {
            return "wrong_user";
        } else if (
            error.includes(
                "User does not exist. Please create an account first."
            )
        ) {
            return "user_does_not_exist";
        } else {
            return "rejected";
        }
    }

    return (
        <>
            <InviteStatusCard type={cardType()} token={tokenParam} />
        </>
    );
}
