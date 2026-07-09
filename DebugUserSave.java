import com.jeff.taskmanager.model.User;
import com.jeff.taskmanager.repository.UserRepository;
import com.jeff.taskmanager.util.PersistanceManager;

public class DebugUserSave {
    public static void main(String[] args) {
        try {
            User user = new User("demo", "hash");
            UserRepository repo = new UserRepository();
            User saved = repo.save(user);
            System.out.println("saved id=" + saved.getId());
        } catch (Throwable t) {
            t.printStackTrace(System.out);
        } finally {
            PersistanceManager.close();
        }
    }
}
