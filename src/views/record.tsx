import {
  createSignal,
  onMount,
  Show,
  type Component,
  onCleanup,
  createEffect,
} from "solid-js";
import { CredentialManager, XRPC } from "@atcute/client";
import { ComAtprotoRepoGetRecord } from "@atcute/client/lexicons";
import { action, query, redirect, useParams } from "@solidjs/router";
import { JSONValue } from "../components/json.jsx";
import { authenticate_post_with_doc } from "public-transport";
import { agent, loginState } from "../views/login.jsx";
import { Editor } from "../components/editor.jsx";
import { editor } from "monaco-editor";
import { setNotice, setPDS, setValidRecord, theme } from "../main.jsx";
import { didDocCache, resolvePDS } from "../utils/api.js";

const RecordView: Component = () => {
  const params = useParams();
  const [record, setRecord] = createSignal<ComAtprotoRepoGetRecord.Output>();
  const [modal, setModal] = createSignal<HTMLDialogElement>();
  const [openDelete, setOpenDelete] = createSignal(false);
  const [openEdit, setOpenEdit] = createSignal(false);
  const [editNotice, setEditNotice] = createSignal("");
  let model: editor.IModel;
  let rpc: XRPC;

  let clickEvent = (event: MouseEvent) => {
    if (modal() && event.target == modal()) {
      setOpenDelete(false);
      setOpenEdit(false);
    }
  };
  let keyEvent = (event: KeyboardEvent) => {
    if (modal() && event.key == "Escape") {
      setOpenDelete(false);
      setOpenEdit(false);
    }
  };

  onMount(async () => {
    window.addEventListener("click", clickEvent);
    window.addEventListener("keydown", keyEvent);
    setNotice("Loading...");
    setValidRecord(undefined);
    setPDS(params.pds);
    let pds =
      params.pds.startsWith("localhost") ?
        `http://${params.pds}`
      : `https://${params.pds}`;
    if (params.pds === "at") pds = await resolvePDS(params.repo);
    rpc = new XRPC({ handler: new CredentialManager({ service: pds }) });
    try {
      const res = await getRecord(params.repo, params.collection, params.rkey);
      setNotice("Validating...");
      setRecord(res.data);
      await authenticate_post_with_doc(
        res.data.uri,
        res.data.cid!,
        res.data.value,
        didDocCache[res.data.uri.split("/")[2]],
      );
      setValidRecord(true);
      setNotice("");
    } catch (err: any) {
      if (err.message) setNotice(err.message);
      else setNotice(`Invalid Record: ${err}`);
      setValidRecord(false);
    }
  });

  onCleanup(() => {
    window.removeEventListener("click", clickEvent);
    window.removeEventListener("keydown", keyEvent);
  });

  const getRecord = query(
    (repo: string, collection: string, rkey: string) =>
      rpc.get("com.atproto.repo.getRecord", {
        params: { repo: repo, collection: collection, rkey: rkey },
      }),
    "getRecord",
  );

  const editRecord = action(async (formData: FormData) => {
    const record = model.getValue();
    if (!record) return;
    rpc = new XRPC({ handler: agent });
    try {
      const editedRecord = JSON.parse(record.toString());
      if (formData.get("recreate")) {
        await rpc.call("com.atproto.repo.deleteRecord", {
          data: {
            repo: params.repo,
            collection: params.collection,
            rkey: params.rkey,
          },
        });
        await rpc.call("com.atproto.repo.createRecord", {
          data: {
            repo: params.repo,
            collection: params.collection,
            rkey: params.rkey,
            record: editedRecord,
          },
        });
      } else {
        await rpc.call("com.atproto.repo.putRecord", {
          data: {
            repo: params.repo,
            collection: params.collection,
            rkey: params.rkey,
            record: editedRecord,
          },
        });
      }
      setOpenEdit(false);
      setTimeout(async () => window.location.reload(), 500);
    } catch (err: any) {
      setEditNotice(err.message);
    }
  });

  const deleteRecord = action(async () => {
    rpc = new XRPC({ handler: agent });
    rpc.call("com.atproto.repo.deleteRecord", {
      data: {
        repo: params.repo,
        collection: params.collection,
        rkey: params.rkey,
      },
    });
    throw redirect(`/at/${params.repo}/${params.collection}`);
  });

  createEffect(() => {
    if (openDelete() || openEdit()) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    setEditNotice("");
  });

  return (
    <Show when={record()}>
      <Show when={loginState() && agent.sub === record()?.uri.split("/")[2]}>
        <div class="mb-3 flex w-full justify-center gap-x-2">
          <Show when={openEdit()}>
            <dialog
              ref={setModal}
              class="fixed left-0 top-0 z-[2] flex h-screen w-screen items-center justify-center bg-transparent font-sans"
            >
              <div class="dark:bg-dark-400 rounded-md border border-slate-900 bg-slate-100 p-4 text-slate-900 dark:border-slate-100 dark:text-slate-100">
                <h3 class="mb-2 text-lg font-bold">Editing record</h3>
                <form action={editRecord} method="post">
                  <Editor theme={theme()} model={model!} />
                  <div class="mt-2 flex flex-col gap-2">
                    <div class="text-red-500 dark:text-red-400">
                      {editNotice()}
                    </div>
                    <div class="flex items-center justify-end gap-2">
                      <div class="flex items-center gap-1">
                        <input
                          id="recreate"
                          class="size-4"
                          name="recreate"
                          type="checkbox"
                        />
                        <label for="recreate" class="select-none">
                          Recreate record
                        </label>
                      </div>
                      <button
                        onclick={() => setOpenEdit(false)}
                        class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        class="rounded-lg bg-green-500 px-2.5 py-1.5 text-sm font-bold text-slate-100 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-green-600 dark:hover:bg-green-500 dark:focus:ring-slate-300"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </dialog>
          </Show>
          <button
            onclick={() => {
              model = editor.createModel(
                JSON.stringify(record()?.value, null, 2),
                "json",
              );
              setOpenEdit(true);
            }}
            class="dark:bg-dark-700 dark:hover:bg-dark-800 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 font-sans text-sm font-bold hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
          >
            Edit
          </button>
          <Show when={openDelete()}>
            <dialog
              ref={setModal}
              class="fixed left-0 top-0 z-[2] flex h-screen w-screen items-center justify-center bg-transparent font-sans"
            >
              <div class="dark:bg-dark-400 rounded-md border border-slate-900 bg-slate-100 p-4 text-slate-900 dark:border-slate-100 dark:text-slate-100">
                <h3 class="text-lg font-bold">Delete this record?</h3>
                <form action={deleteRecord} method="post">
                  <div class="mt-2 inline-flex gap-2">
                    <button
                      onclick={() => setOpenDelete(false)}
                      class="dark:bg-dark-900 dark:hover:bg-dark-800 rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:focus:ring-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class="rounded-lg bg-red-500 px-2.5 py-1.5 text-sm font-bold text-slate-100 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-slate-300"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            </dialog>
          </Show>
          <button
            onclick={() => setOpenDelete(true)}
            class="rounded-lg bg-red-500 px-2.5 py-1.5 font-sans text-sm font-bold text-slate-100 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-slate-700 dark:bg-red-600 dark:hover:bg-red-500 dark:focus:ring-slate-300"
          >
            Delete
          </button>
        </div>
      </Show>
      <div class="mt-2 overflow-y-auto pl-4 text-sm sm:text-base">
        <JSONValue data={record() as any} repo={record()!.uri.split("/")[2]} />
      </div>
    </Show>
  );
};

export { RecordView };
