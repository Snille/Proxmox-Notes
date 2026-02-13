**A vibe coded small tool for creating fancy "Notes" to Proxmox VM/LXC notes "Field".**

Clone the repo, go to http://yourdomain.com/Proxmox-Note/notes/select.html to create your own select.json and save it in the root of the "notes" folder.

Now you can create notes at http://yourdomain.com/Proxmox-Note/notes

All icons are created with "Qwen image 2512 fp8 e4m3fn" in ComfyUI. Then edited with "Qwen image edit 2511 bf16" in ComfyUI to clean the "outside" of the frame (make the background white). Then editied one last time in GIMP to crop, fix "transparency" where the white background was and resize the images to desierd sizes.

You can of course make your own "icons" and place them where ever your Proxmox server can access. Just update the FQDN in the select.json.

Proxmox Example:

![Proxmox Note Example](notes/.github/proxmox-note.png)

Notes Editor:

![Notes Editor](notes/.github/notes-generator.png)

Select.json generator:

![Select Editor](notes/.github/select-generator.png)

One of the original Icons with the "workflow" embeded:

![Huge Icon](notes/.github/example-picture-with-workflow-embeded.png)
