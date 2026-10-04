using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Windows.Forms;

// Independent of Electron: this window remains alive while NSIS replaces the app.
internal sealed class UpdateAnimation : Form
{
    [DllImport("user32.dll")] private static extern bool SystemParametersInfo(uint action, uint parameter, ref int value, uint flags);
    private readonly Timer timer = new Timer();
    private readonly Stopwatch elapsed = Stopwatch.StartNew();
    private readonly Process installer;
    private readonly bool preview;
    private readonly string snapshot;
    private readonly bool motion;
    private readonly PointF[] stars = new PointF[70];
    private bool captured;
    private readonly Font brand = new Font("Segoe UI", 11, FontStyle.Bold);
    private readonly Font title = new Font("Segoe UI", 22, FontStyle.Bold);
    private readonly Font copy = new Font("Segoe UI", 10);
    private readonly Image background;

    private UpdateAnimation(Process parent, bool demo, string image)
    {
        installer = parent; preview = demo; snapshot = image;
        int animations = 1;
        SystemParametersInfo(0x1042, 0, ref animations, 0);
        motion = animations != 0;
        Text = "Updating CrewDeck";
        ClientSize = new Size(720, 480);
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 13, 28);
        DoubleBuffered = true;
        ShowInTaskbar = true;
        AccessibleName = "CrewDeck update in progress";
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("MayuUpdateDesk.png")) {
            if (stream != null) background = new Bitmap(Image.FromStream(stream));
        }
        var random = new Random(42);
        for (int i = 0; i < stars.Length; i++) stars[i] = new PointF(random.Next(16, 544), random.Next(28, 280));
        var close = new Button { Text = "×", FlatStyle = FlatStyle.Flat, ForeColor = Color.FromArgb(235, 235, 240), BackColor = Color.FromArgb(28, 20, 23), Bounds = new Rectangle(674, 10, 32, 30), AccessibleName = "Hide animation; installation continues", TabIndex = 0 };
        close.FlatAppearance.BorderSize = 0;
        close.Click += delegate { Close(); };
        Controls.Add(close);
        timer.Interval = motion ? 33 : 300;
        timer.Tick += delegate {
            if ((!preview && (installer == null || installer.HasExited)) || (preview && elapsed.Elapsed.TotalSeconds > 6)) { Close(); return; }
            Invalidate();
            if (!captured && !String.IsNullOrEmpty(snapshot) && elapsed.Elapsed.TotalSeconds > 1) {
                captured = true;
                using (var bitmap = new Bitmap(Width, Height)) { DrawToBitmap(bitmap, new Rectangle(0, 0, Width, Height)); bitmap.Save(snapshot); }
            }
        };
        timer.Start();
    }
    private void CenterText(Graphics g, string text, Font font, Color color, float y)
    {
        using (var brush = new SolidBrush(color)) {
            var size = g.MeasureString(text, font);
            g.DrawString(text, font, brush, (ClientSize.Width - size.Width) / 2, y);
        }
    }
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        double time = motion ? elapsed.Elapsed.TotalSeconds : 0;
        if (background != null) {
            float scale = Math.Max((float)ClientSize.Width / background.Width, (float)ClientSize.Height / background.Height);
            float drawWidth = background.Width * scale, drawHeight = background.Height * scale;
            g.DrawImage(background, (ClientSize.Width - drawWidth) / 2, (ClientSize.Height - drawHeight) / 2, drawWidth, drawHeight);
            using (var shade = new LinearGradientBrush(new Point(0, 250), new Point(0, ClientSize.Height), Color.FromArgb(6, 7, 10, 12), Color.FromArgb(244, 8, 9, 14)))
                g.FillRectangle(shade, 0, 250, ClientSize.Width, ClientSize.Height - 250);
            using (var edge = new Pen(Color.FromArgb(85, 255, 255, 255))) g.DrawRectangle(edge, 0, 0, Width - 1, Height - 1);
            using (var pill = new SolidBrush(Color.FromArgb(185, 18, 18, 24))) g.FillRectangle(pill, new RectangleF(24, 22, 156, 32));
            using (var brush = new SolidBrush(Color.FromArgb(240, 245, 247, 252))) g.DrawString("CrewDeck", brand, brush, 42, 29);
            for (int i = 0; i < 4; i++) {
                int alpha = 80 + (int)(150 * Math.Max(0, Math.Sin(time * 8 - i * .75)));
                using (var key = new SolidBrush(Color.FromArgb(alpha, 190, 122, 255))) g.FillRectangle(key, new RectangleF(283 + i * 18, 282, 12, 5));
            }
            CenterText(g, "Installing your update", title, Color.FromArgb(248, 249, 252), 340);
            CenterText(g, "Were getting this updated for you!", copy, Color.FromArgb(190, 194, 206), 382);
            using (var track = new SolidBrush(Color.FromArgb(105, 255, 255, 255))) g.FillRectangle(track, new RectangleF(110, 426, 500, 6));
            float deskTravel = motion ? (float)((Math.Sin(time * 1.7) + 1) / 2) * 390 : 195;
            using (var beam = new LinearGradientBrush(new PointF(110 + deskTravel, 0), new PointF(220 + deskTravel, 0), Color.FromArgb(150, 130, 98, 246), Color.FromArgb(240, 200, 126, 255))) g.FillRectangle(beam, new RectangleF(110 + deskTravel, 426, 110, 6));
            CenterText(g, "It is safe to leave this installer open", copy, Color.FromArgb(142, 148, 164), 446);
            return;
        }
        using (var bg = new LinearGradientBrush(ClientRectangle, Color.FromArgb(10, 18, 36), Color.FromArgb(19, 15, 39), 45f)) g.FillRectangle(bg, ClientRectangle);
        using (var edge = new Pen(Color.FromArgb(70, 97, 173, 232))) g.DrawRectangle(edge, 0, 0, Width - 1, Height - 1);
        for (int i = 0; i < stars.Length; i++) {
            float x = stars[i].X, y = (float)((stars[i].Y + time * (3 + i % 4)) % 265 + 28);
            int alpha = 45 + (int)(60 * (1 + Math.Sin(time * 1.4 + i)) / 2);
            using (var star = new SolidBrush(Color.FromArgb(alpha, 175, 201, 248))) g.FillEllipse(star, x, y, i % 3 == 0 ? 2 : 1, i % 3 == 0 ? 2 : 1);
        }
        CenterText(g, "CrewDeck", brand, Color.FromArgb(205, 222, 250), 28);
        var state = g.Save();
        g.TranslateTransform(280, 157);
        g.RotateTransform(-24);
        for (int i = 0; i < 3; i++) {
            using (var ring = new Pen(Color.FromArgb(35 + i * 16, 97, 164, 255), 1.3f)) g.DrawEllipse(ring, -98 - i * 15, -49 - i * 13, 196 + i * 30, 98 + i * 26);
        }
        double angle = time * 1.1;
        float px = (float)Math.Cos(angle) * 112, py = (float)Math.Sin(angle) * 62;
        using (var glow = new SolidBrush(Color.FromArgb(45, 102, 222, 255))) g.FillEllipse(glow, px - 12, py - 12, 24, 24);
        using (var dot = new SolidBrush(Color.FromArgb(119, 226, 255))) g.FillEllipse(dot, px - 4, py - 4, 8, 8);
        g.Restore(state);
        state = g.Save();
        g.TranslateTransform(280, 156 + (float)Math.Sin(time * 2) * 4);
        g.RotateTransform(28);
        using (var trail = new LinearGradientBrush(new Point(0, 25), new Point(0, 82), Color.FromArgb(185, 99, 211, 255), Color.Transparent)) {
            g.FillPolygon(trail, new[] { new Point(-11, 23), new Point(11, 23), new Point(0, 73 + (int)(Math.Sin(time * 9) * 7)) });
        }
        using (var fin = new SolidBrush(Color.FromArgb(108, 104, 235))) {
            g.FillPolygon(fin, new[] { new Point(-12, 0), new Point(-28, 31), new Point(-10, 25) });
            g.FillPolygon(fin, new[] { new Point(12, 0), new Point(28, 31), new Point(10, 25) });
        }
        using (var body = new GraphicsPath()) {
            body.AddBezier(0, -42, -26, -20, -18, 16, -10, 28);
            body.AddLine(-10, 28, 10, 28);
            body.AddBezier(10, 28, 18, 16, 26, -20, 0, -42);
            using (var paint = new LinearGradientBrush(new Point(-18, 0), new Point(18, 0), Color.FromArgb(139, 191, 247), Color.FromArgb(236, 246, 255))) g.FillPath(paint, body);
        }
        using (var window = new SolidBrush(Color.FromArgb(21, 48, 87))) g.FillEllipse(window, -8, -16, 16, 16);
        using (var glass = new Pen(Color.FromArgb(97, 222, 255), 2)) g.DrawEllipse(glass, -8, -16, 16, 16);
        g.Restore(state);
        CenterText(g, "Preparing your next orbit", title, Color.FromArgb(239, 245, 255), 266);
        CenterText(g, "Installing the CrewDeck update…", copy, Color.FromArgb(166, 183, 210), 312);
        using (var track = new SolidBrush(Color.FromArgb(29, 42, 67))) g.FillRectangle(track, 110, 352, 340, 3);
        float travel = motion ? (float)((Math.Sin(time * 1.6) + 1) / 2) * 250 : 125;
        using (var beam = new LinearGradientBrush(new PointF(110 + travel, 0), new PointF(200 + travel, 0), Color.FromArgb(107, 124, 249), Color.FromArgb(89, 221, 253))) g.FillRectangle(beam, 110 + travel, 352, 90, 3);
        CenterText(g, "Your community will be back shortly", copy, Color.FromArgb(111, 131, 164), 374);
    }
    protected override void Dispose(bool disposing) {
        if (disposing) { timer.Dispose(); if (installer != null) installer.Dispose(); if (background != null) background.Dispose(); brand.Dispose(); title.Dispose(); copy.Dispose(); }
        base.Dispose(disposing);
    }
    [STAThread] private static void Main(string[] args) {
        try {
            bool preview = args.Length > 0 && args[0] == "--preview";
            Process parent = preview ? null : Process.GetProcessById(Int32.Parse(args[0]));
            string snapshot = args.Length > 2 && args[1] == "--snapshot" ? Path.GetFullPath(args[2]) : null;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new UpdateAnimation(parent, preview, snapshot));
        } catch { /* Optional visual: never prevent installation. */ }
    }
}
