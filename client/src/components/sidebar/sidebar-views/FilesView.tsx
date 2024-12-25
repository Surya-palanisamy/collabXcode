import FileStructureView from "@/components/files/FileStructureView";
import { useFileSystem } from "@/context/FileContext";
import useResponsive from "@/hooks/useResponsive";
import { FileSystemItem } from "@/types/file";
import cn from "classnames";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { BiArchiveIn } from "react-icons/bi";
import { MdDriveFolderUpload, MdOutlineUploadFile } from "react-icons/md";
import { nanoid } from "nanoid";

function FilesView() {
    const { downloadFilesAndFolders, updateDirectory } = useFileSystem();
    const { viewHeight } = useResponsive();
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenDirectory = async () => {
        try {
            setIsLoading(true);

            if ("showDirectoryPicker" in window) {
                const directoryHandle = await window.showDirectoryPicker();
                await processDirectoryHandle(directoryHandle);
                return;
            }

            if ("webkitdirectory" in HTMLInputElement.prototype) {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.webkitdirectory = true;

                fileInput.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                        const structure = await readFileList(files);
                        updateDirectory("", structure);
                    }
                };

                fileInput.click();
                return;
            }

            toast.error("Your browser does not support directory selection.");
        } catch (error) {
            console.error("Error opening directory:", error);
            toast.error("Failed to open directory");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        try {
            setIsLoading(true);
            const structure = await readFileList(files);
            updateDirectory("", structure);
            toast.success("Files uploaded successfully");
        } catch (error) {
            console.error("Error uploading files:", error);
            toast.error("Failed to upload files");
        } finally {
            setIsLoading(false);
        }
    };

    const processDirectoryHandle = async (
        directoryHandle: FileSystemDirectoryHandle,
    ) => {
        try {
            toast.loading("Getting files and folders...");
            const structure = await readDirectory(directoryHandle);
            updateDirectory("", structure);
            toast.dismiss();
            toast.success("Directory loaded successfully");
        } catch (error) {
            console.error("Error processing directory:", error);
            toast.error("Failed to process directory");
        }
    };

    const readDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
    ): Promise<FileSystemItem[]> => {
        const children: FileSystemItem[] = [];
        const blackList = ["node_modules", ".git", ".vscode", ".next"];

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === "file") {
                const file = await entry.getFile();
                const newFile: FileSystemItem = {
                    id: nanoid(10),
                    name: entry.name,
                    type: "file",
                    content: await readFileContent(file),
                };
                children.push(newFile);
            } else if (entry.kind === "directory") {
                if (blackList.includes(entry.name)) continue;

                const newDirectory: FileSystemItem = {
                    id: nanoid(10),
                    name: entry.name,
                    type: "directory",
                    children: await readDirectory(entry),
                    isOpen: false,
                };
                children.push(newDirectory);
            }
        }
        return children;
    };

    const readFileList = async (files: FileList): Promise<FileSystemItem[]> => {
        const children: FileSystemItem[] = [];
        const blackList = ["node_modules", ".git", ".vscode", ".next"];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const pathParts = file.webkitRelativePath.split("/");

            if (pathParts.some((part) => blackList.includes(part))) continue;

            if (pathParts.length > 1) {
                const directoryPath = pathParts.slice(0, -1).join("/");
                const directoryIndex = children.findIndex(
                    (item) =>
                        item.name === directoryPath &&
                        item.type === "directory",
                );

                if (directoryIndex === -1) {
                    const newDirectory: FileSystemItem = {
                        id: nanoid(10),
                        name: directoryPath,
                        type: "directory",
                        children: [],
                        isOpen: false,
                    };
                    children.push(newDirectory);
                }

                const newFile: FileSystemItem = {
                    id: nanoid(10),
                    name: file.name,
                    type: "file",
                    content: await readFileContent(file),
                };

                const targetDirectory = children.find(
                    (item) =>
                        item.name === directoryPath &&
                        item.type === "directory",
                );
                if (targetDirectory && targetDirectory.children) {
                    targetDirectory.children.push(newFile);
                }
            } else {
                const newFile: FileSystemItem = {
                    id: nanoid(10),
                    name: file.name,
                    type: "file",
                    content: await readFileContent(file),
                };
                children.push(newFile);
            }
        }
        return children;
    };

    const readFileContent = async (file: File): Promise<string> => {
        const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit

        if (file.size > MAX_FILE_SIZE) {
            return `File too large: ${file.name} (${Math.round(
                file.size / 1024,
            )}KB)`;
        }

        try {
            return await file.text();
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            return `Error reading file: ${file.name}`;
        }
    };

    return (
        <div
            className="flex flex-col gap-1 px-4 py-2"
            style={{ height: viewHeight, maxHeight: viewHeight }}
        >
            <FileStructureView />
            <div
                className={cn(
                    "flex flex-col justify-end pt-2 md:flex-row md:items-center md:gap-2",
                    { hidden: isLoading },
                )}
            >
                <button
                    className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover md:w-auto"
                    onClick={handleOpenDirectory}
                    disabled={isLoading}
                >
                    <MdDriveFolderUpload size={24} />
                    <span className="ml-2">
                        {isLoading ? "Loading..." : "Open Folder"}
                    </span>
                </button>
                <label className="flex w-full cursor-pointer justify-start rounded-md p-2 transition-all hover:bg-darkHover md:w-auto">
                    <MdOutlineUploadFile size={24} />
                    <span className="ml-2">Upload Files</span>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>
                <button
                    className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover md:w-auto"
                    onClick={downloadFilesAndFolders}
                >
                    <BiArchiveIn size={22} className="mr-2" />
                    Download Code
                </button>
            </div>
        </div>
    );
}

export default FilesView;
