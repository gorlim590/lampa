package org.lampa.justplusprobe;
import android.content.*; import android.os.*; import org.json.*; import java.io.*;
public class ProbeReceiver extends BroadcastReceiver {
 public void onReceive(Context c, Intent i){ record(c,"callback",i); }
 public static synchronized void record(Context c,String kind,Intent i){try{
 JSONObject o=new JSONObject(); o.put("kind",kind);o.put("wall_ms",System.currentTimeMillis());o.put("elapsed_ms",SystemClock.elapsedRealtime());o.put("session",i.getStringExtra("probe_session"));
 for(String k:new String[]{"index","position_sec","duration_sec"}) if(i.hasExtra(k))o.put(k,i.getIntExtra(k,-1));o.put("end_by",i.getStringExtra("end_by"));
 int[] ps=i.getIntArrayExtra("positions_sec");if(ps!=null){JSONArray a=new JSONArray();for(int x:ps)a.put(x);o.put("positions_sec",a);}
 Parcelable[] hs=i.getParcelableArrayExtra("history");if(hs!=null){JSONArray a=new JSONArray();for(Parcelable x:hs)if(x instanceof Bundle){Bundle b=(Bundle)x;JSONObject v=new JSONObject();for(String k:new String[]{"index","position_sec","duration_sec"})v.put(k,b.getInt(k,-1));for(String k:new String[]{"started_at","ended_at"})v.put(k,b.getLong(k,-1));a.put(v);}o.put("history",a);}
 try(FileWriter f=new FileWriter(new File(c.getFilesDir(),"events.jsonl"),true)){f.write(o.toString()+"\n");}
 }catch(Exception e){android.util.Log.e("JustPlusProbe","record failed "+e.getClass().getSimpleName());}}
}