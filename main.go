package main

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log"
	"sync"

	"github.com/egoist/mygo"
	"imgcompress/internal/exporter"
)

// Desktop exposes only user-selected output and files saved by this session.
type Desktop struct {
	mu        sync.Mutex
	dir       string
	saved     map[string]bool
	win       *mygo.Window
	archive   *exporter.Archive
	archiveID string
}

var frontendURL = "/"

func (d *Desktop) ChooseOutput() (string, error) {
	paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{Parent: d.win, Title: "选择输出文件夹", Directory: true})
	if err != nil || len(paths) == 0 {
		return "", err
	}
	d.mu.Lock()
	d.dir = paths[0]
	d.mu.Unlock()
	return paths[0], nil
}

func (d *Desktop) BeginZip() (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.dir == "" {
		return "", errors.New("请先选择输出文件夹")
	}
	if d.archive != nil {
		return "", errors.New("已有压缩包正在打包")
	}
	a, err := exporter.NewArchive(d.dir)
	if err != nil {
		return "", err
	}
	d.archive = a
	d.archiveID = rand.Text()
	return d.archiveID, nil
}

func decodeImage(encoded string) ([]byte, error) {
	if len(encoded) > (exporter.MaxBytes+2)/3*4 {
		return nil, errors.New("图片超过 100 MB")
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, errors.New("无法解码图片数据")
	}
	return data, nil
}

func (d *Desktop) SaveImage(name, mime, encoded string) (string, error) {
	data, err := decodeImage(encoded)
	if err != nil {
		return "", err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.dir == "" {
		return "", errors.New("请先选择输出文件夹")
	}
	return exporter.Save(d.dir, name, mime, data)
}

func (d *Desktop) AddZip(id, name, mime, encoded string) error {
	data, err := decodeImage(encoded)
	if err != nil {
		return err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.archive == nil || id != d.archiveID {
		return errors.New("压缩包已取消或不存在")
	}
	return d.archive.Add(name, mime, data)
}

func (d *Desktop) FinishZip(id string) (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.archive == nil || id != d.archiveID {
		return "", errors.New("压缩包已取消或不存在")
	}
	path, err := d.archive.Finish()
	d.archive = nil
	d.archiveID = ""
	if path != "" {
		d.saved[path] = true
	}
	return path, err
}

func (d *Desktop) CancelZip(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.archive == nil || id != d.archiveID {
		return nil
	}
	err := d.archive.Cancel()
	d.archive = nil
	d.archiveID = ""
	return err
}

func (d *Desktop) Reveal(path string) error {
	d.mu.Lock()
	allowed := d.saved[path]
	d.mu.Unlock()
	if !allowed {
		return errors.New("只能查看本次导出的文件")
	}
	mygo.Shell.ShowItemInFolder(path)
	return nil
}

func main() {
	desktop := &Desktop{saved: make(map[string]bool)}
	mygo.Bind(desktop)
	mygo.App.OnWillQuit(func(_ *mygo.QuitEvent) {
		desktop.mu.Lock()
		defer desktop.mu.Unlock()
		if desktop.archive != nil {
			if err := desktop.archive.Cancel(); err != nil {
				log.Println(err)
			}
		}
	})
	mygo.App.WhenReady(func() {
		mygo.App.SetMenu(mygo.NewMenu([]*mygo.MenuItem{
			{Role: mygo.RoleAppMenu, Submenu: []*mygo.MenuItem{
				{Label: "关于 ImgCompress", Click: func(_ *mygo.MenuItem, _ *mygo.Window) {
					mygo.App.ShowAboutPanel(mygo.AboutPanelOptions{
						ApplicationName:    "ImgCompress",
						ApplicationVersion: mygo.App.Version(),
						Copyright:          "© 2026 Ruofeng Wang",
						Credits:            "图片轻一点，工作快一点。\n\n作者：Ruofeng Wang（wangruofeng）\nGitHub：https://github.com/wangruofeng/imgcompress",
					})
				}},
				{Label: "在 GitHub 上查看项目…", Click: func(_ *mygo.MenuItem, _ *mygo.Window) {
					if err := mygo.Shell.OpenExternal("https://github.com/wangruofeng/imgcompress"); err != nil {
						log.Println("无法打开 GitHub：", err)
					}
				}},
				mygo.Separator(),
				{Role: mygo.RoleServices},
				mygo.Separator(),
				{Role: mygo.RoleHide}, {Role: mygo.RoleHideOthers}, {Role: mygo.RoleUnhide},
				mygo.Separator(),
				{Role: mygo.RoleQuit},
			}},
			{Role: mygo.RoleFileMenu}, {Role: mygo.RoleEditMenu},
			{Role: mygo.RoleViewMenu}, {Role: mygo.RoleWindowMenu},
		}))
		desktop.win = mygo.NewWindow(mygo.WindowOptions{
			Title: "ImgCompress", URL: frontendURL, Width: 1120, Height: 760,
			MinWidth: 860, MinHeight: 600,
			BackgroundColor: "light-dark(#f7f7f9, #19191c)",
		})
	})
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
