import { createSignal, onMount } from "solid-js";
import {
  configureOAuth,
  createAuthorizationUrl,
  finalizeAuthorization,
  getSession,
  OAuthUserAgent,
  resolveFromIdentity,
  type Session,
} from "@atcute/oauth-browser-client";
import { At } from "@atcute/client/lexicons";
import { useNavigate } from "@solidjs/router";

configureOAuth({
  metadata: {
    client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URL,
  },
});

const [loginState, setLoginState] = createSignal(false);
let agent: OAuthUserAgent;

const Login = () => {
  const [notice, setNotice] = createSignal("");
  const [loginInput, setLoginInput] = createSignal("");

  const loginBsky = async (handle: string) => {
    try {
      setNotice(`Resolving your identity...`);
      const resolved = await resolveFromIdentity(handle);

      setNotice(`Contacting your data server...`);
      const authUrl = await createAuthorizationUrl({
        scope: import.meta.env.VITE_OAUTH_SCOPE,
        ...resolved,
      });

      setNotice(`Redirecting...`);
      await new Promise((resolve) => setTimeout(resolve, 250));

      location.assign(authUrl);
    } catch (e) {
      console.log(e);
      setNotice("Error during OAuth login");
    }
  };

  return (
    <form class="flex flex-col gap-y-1" onsubmit={(e) => e.preventDefault()}>
      <div class="w-full">
        <label for="handle" class="ml-0.5 text-sm">
          Handle
        </label>
      </div>
      <div class="flex gap-x-2">
        <input
          type="text"
          id="handle"
          placeholder="user.bsky.social"
          class="dark:bg-dark-100 rounded-lg border border-gray-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
          onInput={(e) => setLoginInput(e.currentTarget.value)}
        />
        <button
          onclick={() => loginBsky(loginInput())}
          class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-gray-400 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          Login
        </button>
      </div>
      <div class="mt-1">{notice()}</div>
    </form>
  );
};

const LoginStatus = () => {
  const navigate = useNavigate();

  onMount(async () => {
    const init = async (): Promise<Session | undefined> => {
      const params = new URLSearchParams(location.hash.slice(1));

      if (params.has("state") && (params.has("code") || params.has("error"))) {
        history.replaceState(null, "", location.pathname + location.search);

        const session = await finalizeAuthorization(params);
        const did = session.info.sub;

        localStorage.setItem("lastSignedIn", did);
        return session;
      } else {
        const lastSignedIn = localStorage.getItem("lastSignedIn");

        if (lastSignedIn) {
          try {
            return await getSession(lastSignedIn as At.DID);
          } catch (err) {
            localStorage.removeItem("lastSignedIn");
            throw err;
          }
        }
      }
    };

    const session = await init().catch(() => {});

    if (session) {
      agent = new OAuthUserAgent(session);
      setLoginState(true);
    }
  });

  const logoutBsky = async () => {
    setLoginState(false);
    await agent.signOut();
  };

  return (
    <div
      title={loginState() ? "Logout" : "Login"}
      classList={{
        "cursor-pointer text-xl": true,
        "i-lucide-log-in": !loginState(),
        "i-lucide-log-out": loginState(),
      }}
      onclick={() => (loginState() ? logoutBsky() : navigate("/login"))}
    />
  );
};

export { Login, LoginStatus, loginState, agent };
