package org.lampa.justplusprobe;
import android.app.*;import android.content.*;import android.os.*;import android.widget.*;import java.util.*;
public class ProbeActivity extends Activity {
 protected void onCreate(Bundle b){super.onCreate(b);TextView t=new TextView(this);t.setText("JustPlusCallbackProbe — isolated callback diagnostics");setContentView(t);if(b==null)launch();}
 void launch(){String s=UUID.randomUUID().toString();Intent cb=new Intent(this,ProbeReceiver.class).setAction("probe."+s).putExtra("probe_session",s);PendingIntent pi=PendingIntent.getBroadcast(this,0,cb,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);
 Bundle[] items=new Bundle[3];for(int x=0;x<3;x++){items[x]=new Bundle();items[x].putString("uri",(getIntent().getBooleanExtra("long",false)?"content://org.lampa.justplusprobe.media/bunny":"https://media.w3.org/2010/05/sintel/trailer.mp4")+"?probe="+s+"&item="+x);items[x].putString("title","Probe "+(x+1));items[x].putInt("position_sec",0);if(getIntent().getBooleanExtra("long",false))grantUriPermission("com.justplus.player",android.net.Uri.parse(items[x].getString("uri")),Intent.FLAG_GRANT_READ_URI_PERMISSION);}
 Bundle p=new Bundle();p.putParcelableArray("items",items);p.putParcelable("result_callback",pi);p.putInt("start_index",0);if(getIntent().getBooleanExtra("interval",false))p.putInt("report_interval_sec",120);
 Intent i=new Intent(Intent.ACTION_VIEW).setComponent(new ComponentName("com.justplus.player","com.brouken.player.PlayerActivity")).putExtra("playlist",p);ProbeReceiver.record(this,"launch",cb);try{startActivityForResult(i,7);}catch(Exception e){tError(e);}}
 void tError(Exception e){TextView t=new TextView(this);t.setText(e.getClass().getSimpleName());setContentView(t);}
 protected void onActivityResult(int r,int c,Intent i){super.onActivityResult(r,c,i);if(i==null)i=new Intent();i.putExtra("index",i.getIntExtra("index",-1));ProbeReceiver.record(this,"activity_result_"+c,i);}
}